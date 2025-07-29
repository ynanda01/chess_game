'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Manualchessboard from '../../../../components/manualchessboard.jsx';
import ConfirmDialog from '../../../../components/confirmdialog/confirmdialog.jsx';
import { FaEdit, FaTrash } from 'react-icons/fa';
import './page.css';

export default function PuzzlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const experimentId = searchParams.get('experimentId');

  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'); // Default starting position
  const [correctMove, setCorrectMove] = useState('');
  const [adviceFormat, setAdviceFormat] = useState('none'); // default none until fetched
  const [advice, setAdvice] = useState('');
  const [confidence, setConfidence] = useState('');
  const [explanation, setExplanation] = useState('');
  const [reliability, setReliability] = useState('none');
  const [puzzleList, setPuzzleList] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [editIndex, setEditIndex] = useState(null);

  useEffect(() => {
    if (!experimentId) {
      alert('Experiment ID missing');
      router.push('/create-experiment'); // or wherever appropriate
      return;
    }

    /*
    // Fetch condition data from backend using experimentId
    fetch(`/api/conditions/${experimentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.adviceFormat) {
          setAdviceFormat(data.adviceFormat);
        }
      })
      .catch(() => {
        alert('Failed to fetch condition');
      });

    // Optionally fetch saved puzzles for this experiment from backend
    fetch(`/api/puzzles/${experimentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPuzzleList(data);
        }
      });
    */
  }, [experimentId]);

  const resetForm = () => {
    setFen('');
    setCorrectMove('');
    setAdvice('');
    setConfidence('');
    setExplanation('');
    setReliability('none');
    setEditIndex(null);
  };

  const handleAddPuzzle = () => {
    if (!fen || !correctMove) {
      alert('Please enter at least FEN and Correct Move.');
      return;
    }

    const newPuzzle = {
      fen,
      correctMove,
      advice,
      confidence,
      explanation,
      reliability,
    };

    if (editIndex !== null) {
      const updatedList = [...puzzleList];
      updatedList[editIndex] = newPuzzle;
      setPuzzleList(updatedList);
      setEditIndex(null);
    } else {
      setPuzzleList([...puzzleList, newPuzzle]);
    }

    resetForm();
  };

  const handleDeleteClick = (index) => {
    setDeleteIndex(index);
    setShowConfirm(true);
  };

  const confirmDelete = () => {
    const updated = puzzleList.filter((_, i) => i !== deleteIndex);
    setPuzzleList(updated);
    setShowConfirm(false);
    setDeleteIndex(null);
    if (editIndex === deleteIndex) {
      resetForm();
    }
  };

  const cancelDelete = () => {
    setShowConfirm(false);
    setDeleteIndex(null);
  };

  const handleEditClick = (index) => {
    const p = puzzleList[index];
    setFen(p.fen);
    setCorrectMove(p.correctMove);
    setAdvice(p.advice);
    setConfidence(p.confidence);
    setExplanation(p.explanation);
    setReliability(p.reliability);
    setEditIndex(index);
  };

  const handleSaveNext = async () => {
    /*
    // Save puzzles to backend linked with experimentId
    try {
      const res = await fetch(`/api/puzzles/${experimentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(puzzleList),
      });
      if (res.ok) {
        router.push(`/create-experiment/review?experimentId=${experimentId}`);
      } else {
        alert('Failed to save puzzles');
      }
    } catch {
      alert('Error saving puzzles');
    }
    */

    // For now, just alert and navigate (simulate save)
    alert('Save functionality is disabled until backend is ready.');
  };

  const handleBack = () => {
    router.push(`/create-experiment/conditions?experimentId=${experimentId}`);
  };

  return (
    <div className="puzzle-container">
      <h1 className="heading-title">Add Puzzle</h1>

      <div className="puzzle-form">
        <div className="form-left">
          <label>FEN</label>
          <input
            type="text"
            value={fen}
            onChange={(e) => setFen(e.target.value)}
            className="input-field"
            placeholder="Enter FEN"
          />

          <label>Correct Move</label>
          <input
            type="text"
            value={correctMove}
            onChange={(e) => setCorrectMove(e.target.value)}
            className="input-field"
            placeholder="Enter Correct Move"
          />

          <div className="chessboard-box">
            <Manualchessboard fen={fen} />
          </div>
        </div>

        <div className="form-right">
          {adviceFormat !== 'none' && (
            <>
              <label>Advice</label>
              <input
                type="text"
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                className="input-field"
                placeholder="Enter Advice"
              />
            </>
          )}

          {adviceFormat === 'full' && (
            <>
              <label>Confidence</label>
              <input
                type="text"
                value={confidence}
                onChange={(e) => setConfidence(e.target.value)}
                className="input-field"
                placeholder="Enter Confidence"
              />

              <label>Explanation</label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                className="input-field"
                placeholder="Enter Explanation"
                rows={4}
              />
            </>
          )}

          {adviceFormat !== 'none' && (
            <>
              <label>Advice Reliability</label>
              <select
                value={reliability}
                onChange={(e) => setReliability(e.target.value)}
                className="input-field"
              >
                <option value="none">None</option>
                <option value="very">Very Reliable</option>
                <option value="moderate">Moderately Reliable</option>
                <option value="poor">Poor</option>
              </select>
            </>
          )}
        </div>
      </div>

      {puzzleList.length > 0 && (
        <div className="puzzle-list">
          <h3>Added Puzzles</h3>
          {puzzleList.map((p, i) => (
            <div key={i} className="puzzle-item">
              <div className="puzzle-details">
                <div>
                  <strong>FEN:</strong> {p.fen}
                </div>
                <div>
                  <strong>Correct Move:</strong> {p.correctMove}
                </div>
                {p.advice && (
                  <div>
                    <strong>Advice:</strong> {p.advice}
                  </div>
                )}
              </div>
              <div className="puzzle-actions">
                <button className="edit-btn" onClick={() => handleEditClick(i)}>
                  <FaEdit /> Edit
                </button>
                <button className="delete-btn" onClick={() => handleDeleteClick(i)}>
                  <FaTrash /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="buttons">
        <button className="back-button" onClick={handleBack}>
          Back
        </button>
        <button className="add-button" onClick={handleAddPuzzle}>
          {editIndex !== null ? 'Update Puzzle' : 'Add Puzzle'}
        </button>
        <button
          className="save-button"
          disabled={puzzleList.length === 0}
          onClick={handleSaveNext}
        >
          Save / Next
        </button>
      </div>

      {showConfirm && (
        <ConfirmDialog
          show={showConfirm}
          onConfirm={confirmDelete}
          onClose={cancelDelete}
          message="Are you sure you want to delete this puzzle?"
        />
      )}
    </div>
  );
}
