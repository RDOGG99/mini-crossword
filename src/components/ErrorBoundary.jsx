import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 24,
            margin: "16px auto",
            maxWidth: 480,
            border: "1px solid #fca5a5",
            borderRadius: 10,
            background: "#fef2f2",
            textAlign: "center",
          }}
        >
          <p style={{ fontWeight: 700, color: "#b91c1c", marginBottom: 8 }}>
            Something went wrong loading the puzzle.
          </p>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
            {this.state.error?.message || String(this.state.error)}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
