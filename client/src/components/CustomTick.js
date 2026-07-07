import React from "react";

export const CustomTick = ({ x, y, payload }) => {
  const date = new Date(payload.value);

  const godzina = date.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const data = date.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
  });

  return (
    <g transform={`translate(${x},${y})`}>
        <text
            x={0}
            y={12}
            textAnchor={"middle"}
            fontSize={15}
            fill="#585b5f"
            >
            <tspan x={0}>{godzina}</tspan>
            <tspan x={0} dy="15">
                {data}
            </tspan>
        </text>
    </g>
  );
};

