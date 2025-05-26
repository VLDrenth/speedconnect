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
  const [solvedGroups, setSolvedGroups] = useState<string[][]>([]);

  // Define colors for each solved group
  const groupColors = ['#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']; // green, amber, red, purple

  // Organize words: solved groups first, then remaining unsolved words
  const organizedWords = React.useMemo(() => {
    const flatSolvedWords = solvedGroups.flat();
    const unsolvedWords = words.filter(word => !flatSolvedWords.includes(word));
    
    // Fill remaining slots to make 16 total
    const organized = [...flatSolvedWords, ...unsolvedWords];
    while (organized.length < 16) {
      organized.push(''); // Empty slots if needed
    }
    return organized.slice(0, 16);
  }, [words, solvedGroups]);

  const toggleWord = (word: string) => {
    if (!word || solvedWords.includes(word)) return;
    
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
        
        // If correct, add the group to solved groups
        if (result.correct && selectedWords.length === 4) {
          setSolvedGroups(prev => [...prev, [...selectedWords]]);
        }
        
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
        {organizedWords.map((word, index) => {
          const rowIndex = Math.floor(index / 4);
          const isSolvedGroup = rowIndex < solvedGroups.length;
          const groupColor = isSolvedGroup ? groupColors[rowIndex] || '#22c55e' : '#f3f4f6';
          
          return (
            <button
              key={`${word}-${index}`}
              onClick={() => toggleWord(word)}
              disabled={!word || isSubmitting || solvedWords.includes(word) || isSolvedGroup}
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
                cursor: (!word || isSubmitting || solvedWords.includes(word) || isSolvedGroup) ? 'not-allowed' : 'pointer',
                opacity: (!word || isSubmitting || isSolvedGroup) ? 0.7 : 1,
                backgroundColor: selectedWords.includes(word) 
                  ? '#3b82f6' 
                  : groupColor,
                color: selectedWords.includes(word) 
                  ? 'white' 
                  : isSolvedGroup
                  ? 'white'
                  : '#1f2937',
                border: 'none'
              }}
              onMouseEnter={(e) => {
                if (!selectedWords.includes(word) && !isSolvedGroup && word && !isSubmitting) {
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                }
              }}
              onMouseLeave={(e) => {
                if (!selectedWords.includes(word) && !isSolvedGroup && word) {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }
              }}
            >
              {word}
            </button>
          );
        })}
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