import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#d6ff3f",
        }}
      >
        <div
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontStyle: "normal",
            fontWeight: 700,
            fontSize: 124,
            lineHeight: 1,
            color: "#0a0b0d",
            marginTop: -12,
          }}
        >
          ?
        </div>
      </div>
    ),
    { ...size },
  );
}
