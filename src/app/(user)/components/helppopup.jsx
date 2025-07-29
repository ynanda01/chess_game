export default function Helppopup({ title = "Help instructions", children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur effect */}
      <div 
        className="absolute inset-0 bg-transperent/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* helpbox content */}
      <div className="relative bg-[#1f2a1f] rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border border-green-700/30">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-white bg-[#b6042a] hover:bg-[#f50538] rounded-full text-lg font-bold transition-colors duration-200 hover:scale-105"
          aria-label="Close"
        >
          ×
        </button>
        
        {/* Title */}
        <h2 className="text-xl font-semibold mb-4 text-green-300 pr-8">
          {title}
        </h2>
        
        {/* Content */}
        <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">
          {children}
        </div>
      </div>
    </div>
  );
}