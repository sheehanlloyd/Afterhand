import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
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
          backgroundColor: "#0d2a22",
          color: "#c9a75e",
          fontSize: 104,
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            width: 148,
            height: 148,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "4px solid #c9a75e",
          }}
        >
          A
        </div>
      </div>
    ),
    size,
  );
}
