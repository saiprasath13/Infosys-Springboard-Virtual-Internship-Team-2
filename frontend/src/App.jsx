
import { useState } from 'react'
import {
  scenarios,
  PERSONALITIES,
  validateScenarios,
} from './data/scenarios'
import './App.css'

const API_URL = 'http://127.0.0.1:8000/api/negotiate'

function App() {
  const [selectedScenario, setSelectedScenario] = useState(null)
  const [personalities, setPersonalities] = useState({})
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const validation = validateScenarios()

  const handleScenarioSelect = (scenario) => {
    setSelectedScenario(scenario)

    setPersonalities(
      Object.fromEntries(
        scenario.agents.map((agent) => [
          agent.id,
          agent.defaultPersonality ?? agent.personality,
        ]),
      ),
    )

    setError('')
    setResult(null)
  }

  const handlePersonalityChange = (agentId, personality) => {
    setPersonalities((previous) => ({
      ...previous,
      [agentId]: personality,
    }))

    setError('')
    setResult(null)
  }

  const handleStart = async () => {
    setError('')
    setResult(null)

    if (!validation.valid) {
      setError(
        `Scenario data validation failed: ${validation.errors.join(' ')}`,
      )
      return
    }

    if (!selectedScenario) {
      setError('Please select a scenario first.')
      return
    }

    const invalidAgent = selectedScenario.agents.find(
      (agent) => !PERSONALITIES.includes(personalities[agent.id]),
    )

    if (invalidAgent) {
      setError(`Select a valid personality for ${invalidAgent.name}.`)
      return
    }

    const configuration = {
      scenarioId: selectedScenario.id,
      scenarioName: selectedScenario.name,
      maxTurns: 6,
      agents: selectedScenario.agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        role: agent.role,
        roleDescription: agent.roleDescription,
        goal: agent.goal,
        constraints: [...agent.constraints],
        personality: personalities[agent.id],
      })),
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(configuration),
      })

      const data = await response.json()

      if (!response.ok) {
        const detail = Array.isArray(data.detail)
          ? data.detail.map((item) => item.msg).join(', ')
          : data.detail || 'Negotiation request failed.'

        throw new Error(detail)
      }

      setResult(data)
    } catch (err) {
      setError(
        `Negotiation failed: ${err.message}. Check that the backend is running at http://127.0.0.1:8000.`,
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const isProjectBudget = [
    'project-budget',
    'project-budget-allocation',
  ].includes(result?.scenarioId)

  const isJobOffer = [
    'job-offer',
    'job-offer-negotiation',
  ].includes(result?.scenarioId)

  const budgetDetails = result?.agreementDetails
  const totalBudget = Number(budgetDetails?.totalBudgetLakh ?? 10)
  const totalAllocated = Number(budgetDetails?.totalAllocatedLakh ?? 0)
  const remainingBudget = Math.max(
    0,
    Number((totalBudget - totalAllocated).toFixed(2)),
  )

  const formatAmount = (amount) =>
    Number(amount).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    })

  const formatOffer = (offer) => {
    if (offer == null) return null

    if (typeof offer === 'object' && !Array.isArray(offer)) {
      return Object.entries(offer)
        .map(([key, value]) => {
          if (typeof value === 'number') {
            return `${key}: ₹${formatAmount(value)} lakh`
          }

          return `${key}: ${String(value)}`
        })
        .join(' | ')
    }

    if (isProjectBudget) {
      return `Allocation: ₹${formatAmount(offer)} lakh`
    }

    if (isJobOffer) {
      return `Offer: ₹${formatAmount(offer)} LPA`
    }

    return `Offer: ₹${formatAmount(offer)}`
  }

  const getAgentInitials = (name) =>
    name
      .split(' ')
      .map((word) => word[0])
      .slice(0, 2)
      .join('')

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand-mark">MN</div>

        <div>
          <h1>Negotiation Arena</h1>
          <p>Multi-Agent Negotiation Simulator</p>
        </div>

        <span className="phase-label">TASK 1</span>
      </header>

      <section className="intro">
        <span className="eyebrow">SCENARIO CONFIGURATION</span>

        <h2>Set the stage for negotiation.</h2>

        <p>
          Choose a scenario, review each agent&apos;s objectives and
          constraints, and configure their negotiation personalities.
        </p>
      </section>

      {!validation.valid && (
        <div className="notice error" role="alert">
          <strong>Scenario data validation failed:</strong>
          <ul>
            {validation.errors.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="section">
        <div className="section-heading">
          <div>
            <span className="step-number">01</span>
            <h3>Select a scenario</h3>
          </div>

          <span className="muted">
            {scenarios.length} scenarios
          </span>
        </div>

        <div className="scenario-grid">
          {scenarios.map((scenario, index) => (
            <button
              type="button"
              key={scenario.id}
              className={`scenario-card ${
                selectedScenario?.id === scenario.id ? 'selected' : ''
              }`}
              aria-pressed={selectedScenario?.id === scenario.id}
              onClick={() => handleScenarioSelect(scenario)}
            >
              <div className="card-top">
                <span className="scenario-index">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <span className="select-indicator">
                  {selectedScenario?.id === scenario.id ? '✓' : '+'}
                </span>
              </div>

              <h4>{scenario.name}</h4>
              <p>{scenario.description}</p>

              <span className="agent-count">
                {scenario.agents.length} negotiation agents
              </span>
            </button>
          ))}
        </div>
      </section>

      {selectedScenario ? (
        <section className="section agent-section">
          <div className="section-heading">
            <div>
              <span className="step-number">02</span>
              <h3>Configure agents</h3>
            </div>

            <span className="muted">
              {selectedScenario.agents.length} agents selected
            </span>
          </div>

          <div className="selected-summary">
            <span className="summary-dot" />

            <div>
              <strong>{selectedScenario.name}</strong>
              <p>
                Review goals, constraints and personality settings.
              </p>
            </div>
          </div>

          <div className="agent-grid">
            {selectedScenario.agents.map((agent, index) => (
              <article className="agent-card" key={agent.id}>
                <div className="agent-heading">
                  <div className="avatar">
                    {getAgentInitials(agent.name)}
                  </div>

                  <div>
                    <span className="agent-label">
                      AGENT {String(index + 1).padStart(2, '0')}
                    </span>

                    <h4>{agent.name}</h4>
                    <p>{agent.role}</p>
                  </div>
                </div>

                <div className="agent-description">
                  {agent.roleDescription}
                </div>

                <div className="detail-block">
                  <h5>PRIMARY GOAL</h5>
                  <p>{agent.goal}</p>
                </div>

                <div className="detail-block">
                  <h5>CONSTRAINTS</h5>

                  <ul>
                    {agent.constraints.map((constraint, constraintIndex) => (
                      <li key={constraintIndex}>{constraint}</li>
                    ))}
                  </ul>
                </div>

                <div className="personality-control">
                  <label htmlFor={`personality-${agent.id}`}>
                    Negotiation personality
                  </label>

                  <select
                    id={`personality-${agent.id}`}
                    value={
                      personalities[agent.id] ??
                      agent.defaultPersonality ??
                      agent.personality
                    }
                    onChange={(event) =>
                      handlePersonalityChange(
                        agent.id,
                        event.target.value,
                      )
                    }
                  >
                    {PERSONALITIES.map((personality) => (
                      <option key={personality} value={personality}>
                        {personality}
                      </option>
                    ))}
                  </select>

                  <p>
                    Default:{' '}
                    {agent.defaultPersonality ?? agent.personality}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="review-panel">
            <div>
              <span className="eyebrow">CONFIGURATION REVIEW</span>

              <h3>Ready to negotiate?</h3>

              <p>
                Start the negotiation using the selected agents and
                personality settings.
              </p>
            </div>

            <button
              type="button"
              className="start-button"
              onClick={handleStart}
              disabled={!validation.valid || isSubmitting}
            >
              {isSubmitting ? 'Negotiating...' : 'Start Negotiation'}

              {!isSubmitting && <span>→</span>}
            </button>
          </div>

          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}

          {isSubmitting && (
            <div className="notice" role="status">
              Negotiation engine is processing the offers...
            </div>
          )}

          {result && (
            <section
              className="notice success negotiation-result"
              aria-live="polite"
            >
              <span className="eyebrow">NEGOTIATION RESULTS</span>

              <h3>
                {result.status === 'agreement'
                  ? 'Agreement reached!'
                  : 'Negotiation ended'}
              </h3>
                    <div className="result-summary">
              <p>
                <strong>Scenario:</strong> {result.scenarioName}
              </p>

              <p>
                <strong>Status:</strong>{' '}
                {result.status.replaceAll('_', ' ')}
              </p>

              {isProjectBudget ? (
                <>
                  <p>
                    <strong>Total project budget:</strong>{' '}
                    ₹{formatAmount(totalBudget)} lakh
                  </p>

                  <p>
                    <strong>Total allocated:</strong>{' '}
                    ₹{formatAmount(totalAllocated)} lakh
                  </p>

                  <p>
                    <strong>Remaining budget:</strong>{' '}
                    ₹{formatAmount(remainingBudget)} lakh
                  </p>
                    <p>
                <strong>Engine:</strong> {result.engine}
              </p>

              <p>
                <strong>Negotiation turns:</strong> {result.turnsUsed}
              </p>

                  {budgetDetails?.allocationsLakh && (
                    <>
                      <h4>Final department allocations</h4>

                      <div className="transcript">
                        {Object.entries(
                          budgetDetails.allocationsLakh,
                        ).map(([agentId, amount]) => (
                          <article
                            className="transcript-entry"
                            key={agentId}
                          >
                            <div className="transcript-meta">
                              <strong>
                                {agentId
                                  .replaceAll('-', ' ')
                                  .replace(/\b\w/g, (letter) =>
                                    letter.toUpperCase(),
                                  )}
                              </strong>
                            </div>

                            <p>
                              Allocation: ₹{formatAmount(amount)} lakh
                            </p>
                          </article>
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p>
                  <strong>Agreed price:</strong>{' '}
                  {result.agreedPrice != null
                    ? isJobOffer
                      ? `₹${formatAmount(result.agreedPrice)} LPA`
                      : `₹${formatAmount(result.agreedPrice)}`
                    : 'No agreement'}
                </p>
              )}

             
</div>
              <h4>Negotiation transcript</h4>

              <div className="transcript">
                {result.transcript.map((entry, index) => (
                  <article
                    className="transcript-entry"
                    key={`${entry.turn}-${entry.agent}-${index}`}
                  >
                    <div className="transcript-meta">
                      <strong>{entry.agent}</strong>
                      <span>Turn {entry.turn}</span>
                    </div>

                    <p>{entry.message}</p>

                    {entry.offer != null && (
                      <span className="transcript-offer">
                        {formatOffer(entry.offer)}
                      </span>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}
        </section>
      ) : (
        <div className="empty-state">
          <span>↗</span>
          <p>
            Select a scenario above to view its agents and configuration.
          </p>
        </div>
      )}

      <footer>
        <span>Multi-Agent Negotiation Simulator</span>
        <span>Scenario Selection &amp; Agent Configuration</span>
      </footer>
    </main>
  )
}

export default App
