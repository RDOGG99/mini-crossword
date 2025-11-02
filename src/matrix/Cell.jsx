import React from "react";

export default function Cell({
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

  return (
    <div
      className={cls}
      style={activeStyle}
      onClick={() => onClick(row, col)}
      onContextMenu={onContextMenu}
    >
      {cornerNumber != null && <div className="corner-number">{cornerNumber}</div>}
      <input
        className="cell-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={1}
        autoComplete="off"
        spellCheck="false"
        inputMode="latin"
        readOnly={locked}
        aria-readonly={locked}
      />
    </div>
  );
}
