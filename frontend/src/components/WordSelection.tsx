import React, { useState, useEffect } from 'react';
import config from '../config';

interface WordSelectionProps {
  words: string[];
  gameId: string;
  playerId: string;
  onSelectionResult: (result: any) => void;
  solvedWords?: string[];
  gameOver?: boolean; // Add gameOver prop
  allGroups?: Array<{words: string[], category: string}>; // Add allGroups prop for game over state
}

const WordSelection: React.FC<WordSelectionProps> = ({ 
  words, 
  gameId, 
  playerId, 
  onSelectionResult,
  solvedWords = [],
  gameOver = false,
  allGroups = []
}) => {
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Change to store both words and category
  const [solvedGroups, setSolvedGroups] = useState<{words: string[], category: string}[]>([]);
  const [displayGroups, setDisplayGroups] = useState<{words: string[], category: string, solved: boolean}[]>([]);

  // Define colors for each solved group
  const groupColors = ['#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']; // green, amber, red, purple
  
  // Effect to update displayGroups when game ends
  useEffect(() => {
    if (gameOver && allGroups.length > 0) {
      // Create display groups with indication if they were solved
      const groups = allGroups.map(group => {
        const isSolved = solvedGroups.some(
          solved => solved.category === group.category || 
          solved.words.every(word => group.words.includes(word))
        );
        return {
          ...group,
          solved: isSolved
        };
      });
      setDisplayGroups(groups);
    } else {
      // During normal gameplay, just use solved groups
      setDisplayGroups(solvedGroups.map(g => ({...g, solved: true})));
    }
  }, [gameOver, allGroups, solvedGroups]);
  
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
    if (!word || solvedWords.includes(word) || gameOver) return;
    
    if (selectedWords.includes(word)) {
      setSelectedWords(selectedWords.filter(w => w !== word));
    } else if (selectedWords.length < 4) {
      setSelectedWords([...selectedWords, word]);
    }
  };

  const submitSelection = async () => {
    if (selectedWords.length !== 4 || gameOver) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${config.API_BASE_URL}/games/${gameId}/players/${playerId}/select`, {
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
        gridTemplateRows: `repeat(${4 + displayGroups.length}, auto)`,
        gap: '12px',
        padding: '16px',
        minHeight: '400px'
      }}>
        {displayGroups.map((group, groupIndex) => {
          const groupColor = group.solved 
            ? groupColors[groupIndex % groupColors.length] 
            : '#ef4444'; // Unsolved groups are red

          return (
            <React.Fragment key={`group-${groupIndex}`}>
              {/* Category banner - spans all 4 columns */}
              <div
                style={{
                  gridColumn: '1 / span 4',
                  backgroundColor: groupColor,
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
              
              {/* Words in this group */}
              {group.words.map((word, wordIndex) => (
                <button
                  key={`group-word-${groupIndex}-${wordIndex}`}
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
                    opacity: group.solved ? 0.9 : 0.8,
                    backgroundColor: groupColor,
                    color: 'white',
                    border: 'none',
                    cursor: 'not-allowed',
                  }}
                >
                  {word}
                </button>
              ))}
            </React.Fragment>
          );
        })}
        
        {/* Only show remaining unsolved words when game is not over */}
        {!gameOver && words
          .filter(word => !solvedGroups.flatMap(g => g.words).includes(word))
          .map((word, index) => (
            <button
              key={`word-${index}`}
              onClick={() => toggleWord(word)}
              disabled={isSubmitting || solvedWords.includes(word) || gameOver}
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
                cursor: (isSubmitting || solvedWords.includes(word) || gameOver) ? 'not-allowed' : 'pointer',
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
      
      {/* Submit button - hide when game is over */}
      {!gameOver && (
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
      )}
    </div>
  );
};

export default WordSelection;