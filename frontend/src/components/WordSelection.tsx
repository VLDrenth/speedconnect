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
  // Change to store both words and category
  const [solvedGroups, setSolvedGroups] = useState<{words: string[], category: string}[]>([]);

  // Define colors for each solved group
  const groupColors = ['#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']; // green, amber, red, purple

  // Organize words: solved groups first, then remaining unsolved words
  const organizedWords = React.useMemo(() => {
    const flatSolvedWords = solvedGroups.flatMap(group => group.words);
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
        
        // If correct, add the group to solved groups with the category name
        if (result.correct && selectedWords.length === 4) {
          setSolvedGroups(prev => [...prev, {
            words: [...selectedWords],
            category: result.category || "Group " + (prev.length + 1)
          }]);
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
        gridTemplateRows: `repeat(${4 + solvedGroups.length}, auto)`,
        gap: '12px',
        padding: '16px',
        minHeight: '400px'
      }}>
        {solvedGroups.map((group, groupIndex) => (
          <React.Fragment key={`group-${groupIndex}`}>
            {/* Category banner - spans all 4 columns */}
            <div
              style={{
                gridColumn: '1 / span 4',
                backgroundColor: groupColors[groupIndex % groupColors.length],
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: '-5px',
                zIndex: 1
              }}
            >
              {group.category}
            </div>
            
            {/* Words in this solved group */}
            {group.words.map((word, wordIndex) => (
              <button
                key={`solved-${groupIndex}-${wordIndex}`}
                disabled={true}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  minHeight: '80px',
                  fontSize: '18px',
                  fontWeight: '600',
                  borderRadius: '8px',
                  opacity: 0.9,
                  backgroundColor: groupColors[groupIndex % groupColors.length],
                  color: 'white',
                  border: 'none',
                  cursor: 'not-allowed',
                }}
              >
                {word}
              </button>
            ))}
          </React.Fragment>
        ))}
        
        {/* Remaining unsolved words */}
        {words
          .filter(word => !solvedGroups.flatMap(g => g.words).includes(word))
          .map((word, index) => (
            <button
              key={`word-${index}`}
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
                opacity: (isSubmitting) ? 0.7 : 1,
                backgroundColor: selectedWords.includes(word) ? '#3b82f6' : '#f3f4f6',
                color: selectedWords.includes(word) ? 'white' : '#1f2937',
                border: 'none'
              }}
              onMouseEnter={(e) => {
                if (!selectedWords.includes(word) && !isSubmitting) {
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                }
              }}
              onMouseLeave={(e) => {
                if (!selectedWords.includes(word) && !isSubmitting) {
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