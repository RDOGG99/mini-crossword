import React from "react";

export default function ClueList({
  across,
  down,
  currentDirection,
  currentNum,
  onSelectClue,
}) {
  const renderClue = (cl, dir) => {
    const isCurrent = currentDirection === dir && currentNum === cl.num;
    return (
      <li
        key={cl.num}
        className={`clue-item ${isCurrent ? "is-current" : ""}`}
        onClick={() => onSelectClue(dir, cl.num)}
      >
        <span className="clue-num">{cl.num}</span>
        <span className="clue-text">{cl.text || "(placeholder)"}</span>
      </li>
    );
  };

  return (
    <div className="clue-panel">
      <div>
        <h3 className="clue-heading">Across</h3>
        <ul className="clue-list">{across.map((cl) => renderClue(cl, "across"))}</ul>
      </div>
      <div>
        <h3 className="clue-heading">Down</h3>
        <ul className="clue-list">{down.map((cl) => renderClue(cl, "down"))}</ul>
      </div>
    </div>
  );
}

