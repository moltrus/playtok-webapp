import React, { useState, useEffect } from 'react';
import { submitScore } from '../services/gameService';
import './ScoreSubmission.css';

/**
 * A component to submit game scores
 * 
 * @param {string} gameId - The ID of the game to submit a score for
 * @param {number} initialScore - Initial score to display (optional)
 * @param {Function} onSubmitSuccess - Callback for successful submission
 * @param {Function} onCancel - Callback when user cancels submission
 */
const ScoreSubmission = ({ gameId, initialScore = 0, onSubmitSuccess, onCancel }) => {
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('playerName') || '';
  });
  const [score, setScore] = useState(initialScore);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Update score if initialScore changes
  useEffect(() => {
    setScore(initialScore);
  }, [initialScore]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (!gameId) {
      setError('Game ID is missing');
      return;
    }
    
    if (score <= 0) {
      setError('Score must be greater than zero');
      return;
    }
    
    try {
      setSubmitting(true);
      setError('');
      
      // Save player name to localStorage
      localStorage.setItem('playerName', playerName);
      
      // Submit the score
      const response = await submitScore(playerName, gameId, score);
      
      if (response.success) {
        setSuccess(true);
        
        // Call success callback if provided
        if (onSubmitSuccess) {
          onSubmitSuccess({
            player: playerName,
            game: gameId,
            score: score
          });
        }
        
        // Reset after 2 seconds
        setTimeout(() => {
          if (onCancel) onCancel();
        }, 2000);
      } else {
        setError(response.message || 'Failed to submit score');
      }
    } catch (err) {
      setError('Error submitting score: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="score-submission" style={{
      background: 'rgba(10, 10, 31, 0.9)',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 0 20px rgba(0, 255, 255, 0.3), 0 0 40px rgba(138, 43, 226, 0.2)',
      border: '1px solid rgba(0, 255, 255, 0.4)',
      maxWidth: '350px',
      width: '100%'
    }}>
      <h3 style={{
        color: 'rgba(0, 255, 255, 0.9)',
        textAlign: 'center',
        marginTop: 0,
        textShadow: '0 0 8px rgba(0, 255, 255, 0.6)',
        fontSize: '18px'
      }}>
        Submit Your Score
      </h3>
      
      {success ? (
        <div className="success-message" style={{
          background: 'rgba(0, 200, 0, 0.2)',
          color: 'rgba(100, 255, 100, 0.9)',
          padding: '15px',
          textAlign: 'center',
          borderRadius: '4px',
          marginBottom: '15px',
          border: '1px solid rgba(100, 255, 100, 0.3)'
        }}>
          <div style={{
            fontSize: '24px',
            marginBottom: '5px'
          }}>✓</div>
          Score submitted successfully!
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        }}>
          {error && (
            <div className="error-message" style={{
              background: 'rgba(255, 0, 0, 0.2)',
              color: 'rgba(255, 100, 100, 0.9)',
              padding: '10px',
              borderRadius: '4px',
              fontSize: '14px',
              textAlign: 'center',
              border: '1px solid rgba(255, 100, 100, 0.3)'
            }}>
              {error}
            </div>
          )}
          
          <div className="form-group" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
          }}>
            <label style={{
              color: 'rgba(138, 43, 226, 0.9)',
              fontSize: '14px'
            }}>
              Player Name:
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              disabled={submitting || success}
              placeholder="Enter your name"
              style={{
                padding: '10px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '2px solid rgba(0, 255, 255, 0.6)',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '16px'
              }}
              maxLength={20}
            />
          </div>
          
          <div className="form-group" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
          }}>
            <label style={{
              color: 'rgba(138, 43, 226, 0.9)',
              fontSize: '14px'
            }}>
              Score:
            </label>
            <input
              type="number"
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              disabled={submitting || success || initialScore > 0}
              style={{
                padding: '10px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '2px solid rgba(0, 255, 255, 0.6)',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '16px'
              }}
            />
          </div>
          
          <div className="form-actions" style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            marginTop: '10px'
          }}>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={submitting}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  borderRadius: '4px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            )}
            
            <button
              type="submit"
              disabled={submitting || success}
              style={{
                padding: '10px 25px',
                background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.2) 0%, rgba(138, 43, 226, 0.2) 100%)',
                border: '2px solid rgba(0, 255, 255, 0.6)',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Score'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ScoreSubmission;