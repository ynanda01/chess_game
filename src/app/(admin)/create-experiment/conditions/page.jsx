'use client';
import './page.css';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ConditionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const experimentId = searchParams.get('experimentId');

  const [conditionName, setConditionName] = useState('');
  const [adviceFormat, setAdviceFormat] = useState('');
  const [timeOption, setTimeOption] = useState('disable');
  const [timeLimit, setTimeLimit] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!conditionName.trim() || !adviceFormat) {
      alert('Please fill in all required fields');
      return;
    }

    if (!experimentId) {
      alert('No experiment ID found. Please start from the beginning.');
      router.push('/create-experiment');
      return;
    }

    try {
      setLoading(true);

      // ✅ When backend is ready, use this:
      /*
      const conditionData = {
        experimentId,
        name: conditionName,
        adviceFormat,
        timeLimit: timeOption === 'enable' ? timeLimit : null,
      };

      const response = await fetch('/api/conditions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conditionData),
      });

      if (response.ok) {
        if (window.markStepCompleted) {
          await window.markStepCompleted(2);
        }

        router.push(`/create-experiment/puzzles?experimentId=${experimentId}`);
      } else {
        throw new Error('Failed to save condition');
      }
      */

      // 🧪 Temporary mock behavior:
      if (window.markStepCompleted) {
        await window.markStepCompleted(2);
      }

      // Simulate delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      router.push(`/create-experiment/puzzles?experimentId=${experimentId}`);

    } catch (error) {
      console.error('Error saving condition:', error);
      alert('Failed to save condition. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="condition-page">
      <h1 className="heading">Add Condition</h1>

      <div className="condition-inputs">
        <label htmlFor="conditionName" className="inputs">Condition Name</label>
        <input
          id="conditionName"
          className="inputs-field"
          value={conditionName}
          onChange={(e) => setConditionName(e.target.value)}
          placeholder="Condition Name"
          disabled={loading}
        />
      </div>

      <div className="condition-inputs">
        <p className="inputs">Advice Format:</p>
        <div className="radio-group">
          {['none', 'adviceOnly', 'full'].map((option) => (
            <label className="radio-option" key={option}>
              <input
                type="radio"
                name="advice"
                value={option}
                checked={adviceFormat === option}
                onChange={() => setAdviceFormat(option)}
                disabled={loading}
              />
              {option === 'none' ? 'No Advice' :
               option === 'adviceOnly' ? 'Advice Only' :
               'Advice + Confidence + Explanation'}
            </label>
          ))}
        </div>
      </div>

      <div className="condition-inputs">
        <p className="inputs">Time Limit:</p>
        <div className="time-control">
          <select
            className="inputs-field time-select"
            value={timeOption}
            onChange={(e) => setTimeOption(e.target.value)}
            disabled={loading}
          >
            <option value="disable">Disable</option>
            <option value="enable">Enable</option>
          </select>

          {timeOption === 'enable' && (
            <input
              type="number"
              className="inputs-field time-input"
              placeholder="in Sec"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              min="1"
              disabled={loading}
            />
          )}
        </div>
      </div>

      <div className="buttons">
        <button
          onClick={() => router.push(`/create-experiment?experimentId=${experimentId}`)}
          className="back-button"
          disabled={loading}
        >
          Back
        </button>

        <button
          onClick={handleSave}
          disabled={!conditionName.trim() || !adviceFormat || loading}
          className="save-button"
        >
          {loading ? 'Saving...' : 'Save Condition'}
        </button>
      </div>
    </div>
  );
}
