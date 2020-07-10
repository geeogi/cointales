import dayjs from "dayjs";
import React from "react";
import { COLORS } from "../../Config/colors";
import { numberToString } from "../../Core/numberUtils";
import { ChangeSince24H } from "../../Model/coin";
import { Period } from "../../Model/graph";

export const Title = (props: {
  name: string;
  price: number;
  image: string;
  dailyChange: number;
  unix?: number;
  period?: Period;
  active?: boolean;
}) => {
  const { name, price, image, dailyChange, unix, period, active } = props;

  const { POSITIVE, NEGATIVE } = ChangeSince24H;
  const change = dailyChange >= 0 ? POSITIVE : NEGATIVE;
  const color = change && COLORS[change].COLOR;

  const price24HoursAgo = price + dailyChange;
  const dailyChangeDivision = Math.abs(dailyChange / price24HoursAgo);
  const dailyChangePercent = Math.round(dailyChangeDivision * 10000) / 100;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <img
          src={image}
          alt={name}
          style={{ padding: "4px" }}
          width="33px"
          height="33px"
        ></img>
        <h3>
          {name} ${numberToString(price)}
        </h3>
      </div>
      <div
        style={{
          marginLeft: "auto",
          minWidth: "130px",
          textAlign: "right",
        }}
      >
        {!active && (
          <span style={{ color }}>
            {change === ChangeSince24H.POSITIVE ? "+" : "-"}
            {dailyChangePercent}%
          </span>
        )}
        {active && unix && period && (
          <>{dayjs(unix).format(period.scrubFormat)}</>
        )}
      </div>
    </div>
  );
};
