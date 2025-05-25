import React, { useState } from 'react';

interface WordSelectionProps {
  words: string[];
  gameId: string;
  playerId: string;
  onSelectionResult: (result: any) => void;
  solvedWords?: string[]; // Add this new prop
}

const WordSelection: React.FC<WordSelectionProps> = ({ 
  words, 
  gameId, 
  playerId, 
  onSelectionResult,
  solvedWords = [] // Default to empty array
}) => {
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleWord = (word: string) => {
    // Don't allow selecting solved words
    if (solvedWords.includes(word)) return;
    
    if (selectedWords.includes(word)) {
      setSelectedWords(selectedWords.filter(w => w !== word));
    } else if (selectedWords.length < 4) {
      setSelectedWords([...selectedWords, word]);
    }
  };

  const submitSelection = async () => {
    if (selectedWords.length !== 4) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`http://localhost:8000/games/${gameId}/players/${playerId}/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ words: selectedWords }),
      });

      if (response.ok) {
        const result = await response.json();
        onSelectionResult(result);
        setSelectedWords([]);
      }
    } catch (error) {
      console.error('Error submitting selection:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearSelection = () => {
    setSelectedWords([]);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h3 className="text-xl font-bold mb-4 text-center">Select 4 Words</h3>
      
      {/* Selected words counter */}
      <div className="text-center mb-4">
        <span className="text-sm text-gray-600">
          Selected: {selectedWords.length}/4
        </span>
      </div>

      {/* Words grid */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {words.map((word, index) => {
          const isSolved = solvedWords.includes(word);
          return (
            <button
              key={index}
              onClick={() => toggleWord(word)}
              disabled={isSubmitting || isSolved}
              className={`
                p-3 rounded-lg font-medium transition-all duration-200
                ${selectedWords.includes(word) 
                  ? 'bg-blue-500 text-white shadow-lg transform scale-105' 
                  : isSolved
                    ? 'bg-gray-200 text-gray-500 line-through opacity-70' // Style for solved words
                    : 'bg-white text-gray-800 shadow hover:shadow-md hover:bg-gray-50'}
                ${(isSubmitting || isSolved) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {word}
            </button>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={clearSelection}
          disabled={selectedWords.length === 0 || isSubmitting}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear
        </button>
        <button
          onClick={submitSelection}
          disabled={selectedWords.length !== 4 || isSubmitting}
          className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </div>
  );
};

export default WordSelection;