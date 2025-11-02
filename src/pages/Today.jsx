// src/pages/Today.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ymdVancouver } from "../utils/dates";

export default function Today() {
  const nav = useNavigate();

  // Redirect on mount to the canonical Play route for today's date.
  useEffect(() => {
    nav(`/play/${ymdVancouver()}`, { replace: true });
  }, [nav]);

  // Important: return null so no other hooks/UI render and cause mismatches.
  return null;
}
