  // Validate all fields before creating a negotiation
  const validate = (): boolean => {
    setValidationError(null);

    const fail = (message: string): false => {
      setValidationError(message);
      return false;
    };

    const isPositiveFinite = (value: number): boolean =>
      Number.isFinite(value) && value > 0;

    if (!title.trim()) {
      return fail('Please specify a title for the negotiation.');
    }

    if (!agentAName.trim() || !agentBName.trim()) {
      return fail('Both agent names are required.');
    }

    if (!Number.isInteger(maxRounds) || maxRounds < 3 || maxRounds > 30) {
      return fail('Maximum negotiation rounds must be between 3 and 30.');
    }

    // VENDOR PRICING VALIDATION
    if (scenarioType === 'vendor_pricing') {
      const values = [
        startingPrice,
        buyerTargetPrice,
        buyerMaxPrice,
        vendorMinPrice,
        quantity,
        deliveryDays,
      ];

      if (!values.every(isPositiveFinite)) {
        return fail(
          'All vendor pricing values must be greater than zero.'
        );
      }

      if (buyerTargetPrice > buyerMaxPrice) {
        return fail(
          'Buyer Target Price cannot exceed Buyer Maximum Price.'
        );
      }

      // Critical fix: STOP when no ZOPA exists.
      if (vendorMinPrice > buyerMaxPrice) {
        return fail(
          `Negotiation cannot start: Vendor Minimum Price (₹${vendorMinPrice.toLocaleString('en-IN')}) exceeds Buyer Maximum Price (₹${buyerMaxPrice.toLocaleString('en-IN')}). Please correct these values.`
        );
      }

      if (startingPrice < vendorMinPrice) {
        return fail(
          'Vendor Starting Price cannot be lower than Vendor Minimum Price.'
        );
      }

      if (!Number.isInteger(quantity)) {
        return fail('Order Quantity must be a whole number.');
      }

      if (!Number.isInteger(deliveryDays)) {
        return fail('Delivery Days must be a whole number.');
      }

      if (!paymentTerms.trim()) {
        return fail('Please specify payment terms.');
      }
    }

    // JOB OFFER VALIDATION
    if (scenarioType === 'job_offer') {
      const values = [
        startingSalary,
        candidateTarget,
        candidateMin,
        recruiterBudget,
      ];

      if (!values.every(isPositiveFinite)) {
        return fail(
          'All salary values must be greater than zero.'
        );
      }

      if (candidateTarget < candidateMin) {
        return fail(
          'Candidate Target must be greater than or equal to Candidate Minimum.'
        );
      }

      if (candidateMin > recruiterBudget) {
        return fail(
          'Negotiation cannot start: Candidate Minimum exceeds the Recruiter Budget.'
        );
      }

      if (startingSalary > recruiterBudget) {
        return fail(
          'Starting Salary Offer cannot exceed the Recruiter Budget.'
        );
      }

      if (!Number.isInteger(joiningDays) || joiningDays < 0) {
        return fail(
          'Joining Notice Days must be a non-negative whole number.'
        );
      }
    }

    // PROJECT BUDGET VALIDATION
    if (scenarioType === 'project_budget') {
      const values = [
        totalBudget,
        alphaRequested,
        betaRequested,
        alphaMinimum,
        betaMinimum,
      ];

      if (!values.every(isPositiveFinite)) {
        return fail(
          'All project budget values must be greater than zero.'
        );
      }

      if (alphaMinimum > alphaRequested) {
        return fail(
          'Team Alpha Minimum cannot exceed Team Alpha Desired Budget.'
        );
      }

      if (betaMinimum > betaRequested) {
        return fail(
          'Team Beta Minimum cannot exceed Team Beta Desired Budget.'
        );
      }

      if (alphaMinimum + betaMinimum > totalBudget) {
        return fail(
          'Negotiation cannot start: Combined minimum requests exceed the total budget.'
        );
      }
    }

    return true;
  };

  // Submit and start negotiation
  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();

    // Stop immediately if validation fails.
    if (!validate()) {
      return;
    }

    try {
      setLoading(true);
      setValidationError(null);

      const config = buildConfig();

      const createRes = await negotiationsApi.create({
        title: title.trim(),
        scenario_type: scenarioType,
        mode,
        config,
        max_rounds: Number(maxRounds),
      });

      const newId = createRes.data.id;

      // Only navigate after the start request succeeds.
      await negotiationsApi.start(newId);

      toast.success('Negotiation started successfully.');
      navigate(`/app/negotiations/${newId}`);
    } catch (err) {
      const msg = getErrorMessage(err);

      setValidationError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };
