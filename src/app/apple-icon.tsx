import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  // Dev-only branding (#28): orange + hard hat on local dev, prod untouched.
  const isDev = process.env.NODE_ENV === "development";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0b0d",
          borderRadius: 40,
          border: isDev ? "8px dashed #ff9f1c" : "8px solid #d6ff3f",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            fontFamily: "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
            fontStyle: "normal",
            fontWeight: 700,
            fontSize: isDev ? 96 : 124,
            lineHeight: 1,
            color: isDev ? "#ff9f1c" : "#d6ff3f",
            marginTop: 8,
          }}
        >
          {isDev ? "👷" : "?"}
        </div>
      </div>
    ),
    { ...size },
  );
}
