"use client";
import './confirmdialog.css';

export default function ConfirmDialog({ show, onClose, onConfirm }) {
  if (!show) return null;

  return (
    <div className="confirm-overlay">
      <div className="confirm-box">
        <h2 className="confirm-title">Confirm </h2>
        <p className="confirm-text">Are you sure you want to delete this puzzle?</p>
        <div className="confirm-actions">
          <button className="confirm-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="confirm-delete" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
