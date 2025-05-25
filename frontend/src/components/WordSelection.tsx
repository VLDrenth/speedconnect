import React, { useState } from 'react';

interface WordSelectionProps {
  words: string[];
  gameId: string;
  playerId: string;
  onSelectionResult: (result: any) => void;
  solvedWords?: string[];
}

const WordSelection: React.FC<WordSelectionProps> = ({ 
  words, 
  gameId, 
  playerId, 
  onSelectionResult,
  solvedWords = []
}) => {
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleWord = (word: string) => {
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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 4x4 Word Grid using CSS Grid */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        padding: '16px',
        minHeight: '400px'
      }}>
        {words.map((word, index) => (
          <button
            key={index}
            onClick={() => toggleWord(word)}
            disabled={isSubmitting || solvedWords.includes(word)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              minHeight: '80px',
              fontSize: '18px',
              fontWeight: '600',
              borderRadius: '8px',
              transition: 'all 0.2s',
              cursor: (isSubmitting || solvedWords.includes(word)) ? 'not-allowed' : 'pointer',
              opacity: (isSubmitting || solvedWords.includes(word)) ? 0.5 : 1,
              backgroundColor: selectedWords.includes(word) 
                ? '#3b82f6' 
                : solvedWords.includes(word)
                ? '#bbf7d0'
                : '#f3f4f6',
              color: selectedWords.includes(word) 
                ? 'white' 
                : solvedWords.includes(word)
                ? '#6b7280'
                : '#1f2937',
              border: 'none'
            }}
            onMouseEnter={(e) => {
              if (!selectedWords.includes(word) && !solvedWords.includes(word) && !isSubmitting) {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
              }
            }}
            onMouseLeave={(e) => {
              if (!selectedWords.includes(word) && !solvedWords.includes(word)) {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }
            }}
          >
            {word}
          </button>
        ))}
      </div>
      
      {/* Submit button */}
      <div style={{ textAlign: 'center', paddingTop: '16px', flexShrink: 0 }}>
        <button
          onClick={submitSelection}
          disabled={selectedWords.length !== 4 || isSubmitting}
          style={{
            backgroundColor: selectedWords.length === 4 && !isSubmitting ? '#2563eb' : '#9ca3af',
            color: 'white',
            fontWeight: 'bold',
            padding: '12px 32px',
            borderRadius: '8px',
            border: 'none',
            cursor: selectedWords.length === 4 && !isSubmitting ? 'pointer' : 'not-allowed',
            fontSize: '16px'
          }}
          onMouseEnter={(e) => {
            if (selectedWords.length === 4 && !isSubmitting) {
              e.currentTarget.style.backgroundColor = '#1d4ed8';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedWords.length === 4 && !isSubmitting) {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }
          }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Group'}
        </button>
      </div>
    </div>
  );
};

export default WordSelection;