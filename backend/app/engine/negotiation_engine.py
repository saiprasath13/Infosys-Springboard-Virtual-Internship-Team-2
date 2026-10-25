
    async def _run_simulation_loop(self):
        neg = await self._load_negotiation()
        if not neg:
            logger.error(
                "Negotiation %s not found",
                self.negotiation_id,
            )
            return

        # Never restart a negotiation that has already ended.
        if neg.status in (
            NegotiationStatus.PAUSED,
            NegotiationStatus.CANCELLED,
            NegotiationStatus.DEADLOCKED,
            NegotiationStatus.COMPLETED,
        ):
            logger.info(
                "Negotiation %s is already stopped (status=%s)",
                self.negotiation_id,
                neg.status,
            )
            return

        config = neg.config or {}

        # Validate all scenario constraints BEFORE creating agents,
        # writing the "Negotiation started" message, or running rounds.
        try:
            rules = get_scenario_rules(
                neg.scenario_type,
                config,
            )
        except (ValueError, TypeError, OverflowError) as exc:
            await self._stop_for_validation_error(neg, str(exc))
            return

        # Agent creation happens only after configuration is valid.
        agent_a = _get_agent(
            config.get("agent_a_personality", "collaborative"),
            "agent_a",
        )
        agent_b = _get_agent(
            config.get("agent_b_personality", "aggressive"),
            "agent_b",
        )

        await self._add_message(
            MessageRole.SYSTEM,
            f"Negotiation started: {neg.title}. "
            f"Max rounds: {neg.max_rounds}. Mode: AI vs AI (Simulation).",
        )
        await self.db.commit()

        offer_history = []

        for round_num in range(1, neg.max_rounds + 1):
            # Reload from the database so a pause/cancel/stop request
            # made while the simulation is running is observed.
            neg = await self._load_negotiation()
            if not neg:
                return

            if neg.status in (
                NegotiationStatus.PAUSED,
                NegotiationStatus.CANCELLED,
                NegotiationStatus.DEADLOCKED,
                NegotiationStatus.COMPLETED,
            ):
                logger.info(
                    "Negotiation %s stopped at round %s",
                    self.negotiation_id,
                    round_num,
                )
                return

            # Revalidate configuration before every round. This also
            # prevents further execution if stored constraints changed.
            try:
                rules = get_scenario_rules(
                    neg.scenario_type,
                    neg.config or {},
                )
            except (ValueError, TypeError, OverflowError) as exc:
                await self._stop_for_validation_error(neg, str(exc))
                return

            neg.current_round = round_num
            await self.db.flush()

            # Agent A proposes.
            try:
                a_offer, a_message = await agent_a.generate_offer(
                    round_num=round_num,
                    scenario_rules=rules,
                    offer_history=offer_history,
                    opponent_name=config.get("agent_b_name", "Party B"),
                )
                a_offer = rules.clamp_offer("agent_a", a_offer)
            except (ValueError, TypeError, AttributeError, OverflowError) as exc:
                await self._stop_for_validation_error(neg, str(exc))
                return

            await self._add_message(
                MessageRole.AGENT_A,
                a_message,
                round_num,
            )
            offer_record_a = await self._add_offer(
                round_num,
                "agent_a",
                a_offer,
                a_message,
            )
            offer_history.append(
                {"round": round_num, "by": "agent_a", "offer": a_offer}
            )
            await self.db.commit()

            await asyncio.sleep(0.5)

            # Check whether the simulation was stopped during the delay.
            neg = await self._load_negotiation()
            if not neg or neg.status in (
                NegotiationStatus.PAUSED,
                NegotiationStatus.CANCELLED,
                NegotiationStatus.DEADLOCKED,
                NegotiationStatus.COMPLETED,
            ):
                return

            # Agent B evaluates Agent A's offer.
            try:
                b_decision, b_counter, b_message = await agent_b.evaluate_offer(
                    round_num=round_num,
                    opponent_offer=a_offer,
                    scenario_rules=rules,
                    offer_history=offer_history,
                    opponent_name=config.get("agent_a_name", "Party A"),
                )

                if (
                    b_decision == "accept"
                    and not rules.is_offer_acceptable("agent_b", a_offer)
                ):
                    b_decision = "counter"
                    b_counter = rules.clamp_offer("agent_b", a_offer)
                    prefix = "[MOCK] " if isinstance(agent_b, MockAgent) else ""
                    b_message = (
                        f"{prefix}The offer is outside my acceptable limits. "
                        "Here is my counter-offer."
                    )

                if b_decision == "accept":
                    if not self._valid_final_offer(rules, a_offer):
                        await self._stop_for_validation_error(
                            neg,
                            "Final offer violates the negotiation price limits.",
                        )
                        return

                    await self._add_message(
                        MessageRole.AGENT_B,
                        b_message,
                        round_num,
                    )
                    offer_record_a.status = OfferStatus.ACCEPTED
                    await self._complete_negotiation(
                        neg,
                        rules,
                        a_offer,
                        offer_history,
                    )
                    return

                b_counter = rules.clamp_offer(
                    "agent_b",
                    b_counter or a_offer,
                )

            except (ValueError, TypeError, AttributeError, OverflowError) as exc:
                await self._stop_for_validation_error(neg, str(exc))
                return

            offer_record_a.status = (
                OfferStatus.COUNTERED
                if b_decision == "counter"
                else OfferStatus.REJECTED
            )

            await self._add_message(
                MessageRole.AGENT_B,
                b_message,
                round_num,
            )
            offer_record_b = await self._add_offer(
                round_num,
                "agent_b",
                b_counter,
                b_message,
            )
            offer_history.append(
                {"round": round_num, "by": "agent_b", "offer": b_counter}
            )
            await self.db.commit()

            await asyncio.sleep(0.5)

            # Stop before Agent A is called if the negotiation ended.
            neg = await self._load_negotiation()
            if not neg or neg.status in (
                NegotiationStatus.PAUSED,
                NegotiationStatus.CANCELLED,
                NegotiationStatus.DEADLOCKED,
                NegotiationStatus.COMPLETED,
            ):
                return

            try:
                a_decision, _, a_response = await agent_a.evaluate_offer(
                    round_num=round_num,
                    opponent_offer=b_counter,
                    scenario_rules=rules,
                    offer_history=offer_history,
                    opponent_name=config.get("agent_b_name", "Party B"),
                )

                if (
                    a_decision == "accept"
                    and not rules.is_offer_acceptable("agent_a", b_counter)
                ):
                    a_decision = "counter"
                    prefix = "[MOCK] " if isinstance(agent_a, MockAgent) else ""
                    a_response = (
                        f"{prefix}The offer is outside my acceptable limits. "
                        "I cannot accept these terms."
                    )

                if a_decision == "accept":
                    if not self._valid_final_offer(rules, b_counter):
                        await self._stop_for_validation_error(
                            neg,
                            "Final offer violates the negotiation price limits.",
                        )
                        return

                    await self._add_message(
                        MessageRole.AGENT_A,
                        a_response,
                        round_num,
                    )
                    offer_record_b.status = OfferStatus.ACCEPTED
                    await self._complete_negotiation(
                        neg,
                        rules,
                        b_counter,
                        offer_history,
                    )
                    return

            except (ValueError, TypeError, AttributeError, OverflowError) as exc:
                await self._stop_for_validation_error(neg, str(exc))
                return

            offer_record_b.status = OfferStatus.COUNTERED
            await self._add_message(
                MessageRole.AGENT_A,
                a_response,
                round_num,
            )
            await self.db.commit()

            if self._detect_deadlock(offer_history):
                await self._deadlock_negotiation(neg)
                return

        # Maximum rounds reached.
        neg = await self._load_negotiation()
        if neg and neg.status not in (
            NegotiationStatus.PAUSED,
            NegotiationStatus.CANCELLED,
            NegotiationStatus.DEADLOCKED,
            NegotiationStatus.COMPLETED,
        ):
            await self._deadlock_negotiation(neg)
