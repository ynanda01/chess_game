'use client';
import { useEffect, useState } from 'react';
import { CheckCircle, Settings, Brain, Lightbulb, Edit3, Save, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ReviewPage() {
  const [experiment, setExperiment] = useState({});
  const [condition, setCondition] = useState({});
  const [puzzle, setPuzzle] = useState({});
  const [advice, setAdvice] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Get data from previous steps (stored in localStorage during the creation flow)
    const storedExperiment = JSON.parse(localStorage.getItem('experiment') || '{}');
    const storedCondition = JSON.parse(localStorage.getItem('condition') || '{}');
    const storedPuzzle = JSON.parse(localStorage.getItem('puzzle') || '{}');
    const storedAdvice = JSON.parse(localStorage.getItem('advice') || '{}');

    setExperiment(storedExperiment);
    setCondition(storedCondition);
    setPuzzle(storedPuzzle);
    setAdvice(storedAdvice);
  }, []);

  const handleSaveExperiment = async () => {
    setIsSaving(true);
    try {
      // Combine all data into a complete experiment object
      const completeExperiment = {
        name: experiment.name,
        description: experiment.description,
        condition: {
          name: condition.name,
          adviceFormat: condition.adviceFormat,
          timeLimit: condition.timeLimit
        },
        puzzle: {
          fen: puzzle.fen,
          correctMove: puzzle.correctMove,
          difficulty: puzzle.difficulty || 'medium'
        },
        advice: {
          advice: advice.advice,
          confidence: advice.confidence,
          explanation: advice.explanation,
          reliability: advice.reliability
        },
        createdAt: new Date().toISOString(),
        status: 'draft', // or 'active', 'completed'
        userId: 'current-user-id' // You'll get this from your auth system
      };

      // Save to database
      const response = await fetch('/api/experiments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(completeExperiment)
      });

      if (response.ok) {
        const savedExperiment = await response.json();
        
        // Also save the puzzle to user's created puzzles
        await fetch('/api/puzzles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fen: puzzle.fen,
            correctMove: puzzle.correctMove,
            difficulty: puzzle.difficulty || 'medium',
            createdBy: 'current-user-id',
            createdAt: new Date().toISOString(),
            usedInExperiment: savedExperiment.id
          })
        });

        setSaveSuccess(true);
        
        // Clear localStorage after successful save
        localStorage.removeItem('experiment');
        localStorage.removeItem('condition');
        localStorage.removeItem('puzzle');
        localStorage.removeItem('advice');

        // Redirect to home page after short delay
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        throw new Error('Failed to save experiment');
      }
    } catch (error) {
      console.error('Error saving experiment:', error);
      alert('Failed to save experiment. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    // Keep the data in localStorage so it's available when editing
    // Data is already in localStorage from the creation flow
    router.push('/create-experiment');
  };

  const sections = [
    {
      title: 'Experiment Info',
      icon: <Settings className="w-5 h-5" />,
      color: 'blue',
      items: [
        { label: 'Name', value: experiment.name },
        { label: 'Description', value: experiment.description }
      ]
    },
    {
      title: 'Condition',
      icon: <Brain className="w-5 h-5" />,
      color: 'purple',
      items: [
        { label: 'Name', value: condition.name },
        { label: 'Advice Format', value: condition.adviceFormat },
        { label: 'Time Limit', value: condition.timeLimit ? `${condition.timeLimit} seconds` : 'Disabled' }
      ]
    },
    {
      title: 'Puzzle',
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'green',
      items: [
        { label: 'FEN Position', value: puzzle.fen },
        { label: 'Correct Move', value: puzzle.correctMove },
        { label: 'Difficulty', value: puzzle.difficulty || 'Medium' }
      ]
    },
    {
      title: 'Advice Configuration',
      icon: <Lightbulb className="w-5 h-5" />,
      color: 'amber',
      items: [
        { label: 'Advice Text', value: advice.advice },
        { label: 'Confidence Level', value: advice.confidence ? `${advice.confidence}%` : 'N/A' },
        { label: 'Explanation', value: advice.explanation },
        { label: 'Reliability', value: advice.reliability }
      ]
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'border-blue-200 bg-blue-50',
      purple: 'border-purple-200 bg-purple-50',
      green: 'border-green-200 bg-green-50',
      amber: 'border-amber-200 bg-amber-50'
    };
    return colors[color] || colors.blue;
  };

  const getIconColor = (color) => {
    const colors = {
      blue: 'text-blue-600',
      purple: 'text-purple-600',
      green: 'text-green-600',
      amber: 'text-amber-600'
    };
    return colors[color] || colors.blue;
  };

  if (saveSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Experiment Saved!</h2>
          <p className="text-gray-600 mb-4">
            Your experiment has been saved successfully and will appear in Recent Experiments on your home page.
          </p>
          <p className="text-sm text-gray-500">Redirecting to home page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Review Experiment
          </h1>
          <p className="text-gray-600">
            Review your experiment configuration before saving
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {sections.map((section, index) => (
            <div
              key={index}
              className={`rounded-xl border-2 ${getColorClasses(section.color)} p-6 transition-all duration-200 hover:shadow-md`}
            >
              {/* Section Header */}
              <div className="flex items-center mb-4">
                <div className={`${getIconColor(section.color)} mr-3`}>
                  {section.icon}
                </div>
                <h2 className="text-xl font-semibold text-gray-800">
                  {section.title}
                </h2>
              </div>

              {/* Section Items */}
              <div className="space-y-3">
                {section.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="border-b border-gray-200 pb-2 last:border-b-0">
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="font-medium text-gray-700 mb-1 sm:mb-0">
                        {item.label}:
                      </span>
                      <span className="text-gray-900 break-words max-w-full sm:max-w-xs text-right">
                        {item.value || 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => router.back()}
              className="flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
            <button 
              onClick={handleEdit}
              className="flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Configuration
            </button>
            <button 
              onClick={handleSaveExperiment}
              disabled={isSaving}
              className="flex items-center justify-center px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors duration-200 font-medium shadow-sm"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Experiment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}