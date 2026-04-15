// src/matrix/Cell.jsx
import { memo } from "react";

const Cell = memo(function Cell({
  row,
  col,
  isBlock,
  value,
  feedback,      // "correct" | "incorrect" | null
  isActive,
  inAnswer,
  inBand,
  isRevealed,
  cornerNumber,
  locked,
  inputRef,
  onClick,
  onChange,
  onContextMenu,
}) {
  if (isBlock) return <div className="cell cell-block" onContextMenu={onContextMenu} />;

  const cls = [
    "cell",
    isActive && "cell-active",
    inAnswer && "cell-in-answer",
    inBand && "cell-in-band",
    isRevealed && "cell-revealed",
    locked && "cell-locked",
    feedback === "correct" && "cell-correct",
    feedback === "incorrect" && "cell-incorrect",
  ].filter(Boolean).join(" ");

  // Filled yellow for active cell + amber edge
  const activeStyle = isActive
    ? {
        background: "#fff3a3",
        boxShadow: "inset 0 0 0 2px #f59e0b",
        position: "relative",
      }
    : undefined;

  // Sanitize to a single A–Z character (uppercased). If empty, pass "" (clears cell).
  const handleInputChange = (e) => {
    const raw = e.target.value || "";
    const lastChar = raw.slice(-1); // only consider the most recent character
    if (!lastChar) {
      onChange(""); // user deleted; Grid will ignore advancing
      return;
    }
    const m = lastChar.match(/[A-Za-z]/);
    if (m) {
      onChange(m[0].toUpperCase());
    } else {
      // Non-letter typed; keep existing value by re-emitting current value
      onChange(value || "");
    }
  };

  return (
    <div
      className={cls}
      style={activeStyle}
      onClick={() => onClick(row, col)}
      onContextMenu={onContextMenu}
    >
      {cornerNumber != null && <div className="corner-number">{cornerNumber}</div>}
      <input
        ref={inputRef}
        className="cell-input"
        value={value ?? ""}
        onChange={handleInputChange}
        maxLength={1}
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        inputMode="text"
        autoCapitalize="characters"
        readOnly={locked}
        aria-readonly={locked}
        aria-label={`Row ${row + 1}, Column ${col + 1}`}
      />
    </div>
  );
});

export default Cell;
