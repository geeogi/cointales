import dayjs from "dayjs";
import React, { useEffect, useRef, useState } from "react";
import { COLORS } from "../Config/colors";
import { scale2DCanvas } from "../Core/canvasUtils";
import { drawLine, fillPath, getGradientMethod } from "../Core/drawUtils";
import { addInteractivityHandlers } from "../Core/eventUtils";
import { getGraphConfig } from "../Core/graphUtils";
import { numberWithSignificantDigits } from "../Core/numberUtils";
import { ChangeSince24H } from "../Model/coin";
import { GraphValues, Period } from "../Model/graph";
import { ActiveCircle } from "./Graph/ActiveCircle";
import { ActiveLine } from "./Graph/ActiveLine";
import { Frame } from "./Graph/Frame";
import { HorizontalGridLine } from "./Graph/HorizontalGridLine";
import { Label } from "./Graph/Label";
import { VerticalGridLine } from "./Graph/VerticalGridLine";

export const Graph = (props: {
  values?: GraphValues;
  loading?: boolean;
  width: number;
  height: number;
  period: Period;
  change: ChangeSince24H;
  name: string;
  setActiveValue: (active: { price: number; unix: number } | undefined) => void;
}) => {
  const [xLabels, setXLabels] = useState<JSX.Element[]>();
  const [yLabels, setYLabels] = useState<JSX.Element[]>();
  const [xGridLines, setXGridLines] = useState<JSX.Element[]>();
  const [yGridLines, setYGridLines] = useState<JSX.Element[]>();
  const [activePoint, setActivePoint] = useState<{
    left: number;
    top: number;
  }>();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    values,
    change,
    name,
    loading,
    width,
    height,
    period,
    setActiveValue,
  } = props;

  // Use neutral colour while active
  const colors = activePoint ? COLORS.NEUTRAL : COLORS[change];

  /**
   * Draw graph when canvas loads and whenever `values` changes
   */
  useEffect(() => {
    const canvasElement = canvasRef.current;

    if (!canvasElement || !values) {
      return;
    }

    // Sample values to achieve roughly 1 point per pixel
    const sample = values.filter(
      (_, index) => index % Math.ceil(values.length / width) === 0
    );

    // Get graph values
    const {
      points,
      dateLabels,
      priceLabels,
      scalePriceY,
      scaleUnixX,
    } = getGraphConfig({ values: sample, period });

    // Retrieve canvas context
    const ctx = canvasElement.getContext("2d");
    if (!ctx) {
      throw new Error("Unable to retrieve 2D context");
    }

    // Scale the canvas for retina displays
    scale2DCanvas(ctx, canvasElement);

    // Fetch the desired canvas height and width
    const canvasHeight = canvasElement.offsetHeight;
    const canvasWidth = canvasElement.offsetWidth;

    // Clear graph
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Calculate graph dimensions
    const graphDepth = canvasHeight;
    const graphWidth = canvasWidth;

    // Utils to convert from clip space [-1,1] to graph coordinates
    const toGraphX = (x: number) => ((x + 1) / 2) * graphWidth;
    const toGraphY = (y: number) => ((y + 1) / 2.2) * graphDepth + 12;

    // Utils to convert from graph coordinates to canvas pixels
    const toCanvasX = (graphX: number) => graphX;
    const toCanvasY = (graphY: number) => graphDepth - graphY;

    // Configure gradient util
    const getGradient = getGradientMethod(ctx, 0, graphDepth);

    // Scale graph coordinates from clip space [-1,1] to screen resolution
    const scaledPoints = points.map((point) => ({
      canvasX: toCanvasX(toGraphX(point.x)),
      canvasY: toCanvasY(toGraphY(point.y)),
    }));

    // Draw primary block
    const firstPoint = { canvasX: toCanvasX(0), canvasY: toCanvasY(0) };
    const lastPoint = { canvasX: toCanvasX(graphWidth), canvasY: toCanvasY(0) };
    const path = [firstPoint, ...scaledPoints, lastPoint];
    const topColor = colors.COLOR_ALPHA(0.6);
    const bottomColor = colors.COLOR_ALPHA(0);
    const gradient = getGradient(topColor, bottomColor);
    fillPath(ctx, path, gradient);

    // Draw primary line
    drawLine(ctx, scaledPoints, colors.COLOR, 2);

    // Add interactivity handler
    addInteractivityHandlers(({ activeX }) => {
      if (activeX) {
        // Scale activeX to [-1,1]
        const activeClipSpaceX = (activeX / graphWidth) * 2 - 1;

        // Fetch nearest point to activeX
        const [{ x, y, price, unix }] = [...points].sort(
          (a, b) =>
            Math.abs(a.x - activeClipSpaceX) - Math.abs(b.x - activeClipSpaceX)
        );

        // Set active state
        const left = toCanvasX(toGraphX(x));
        const top = toCanvasY(toGraphY(y));
        setActivePoint({ left, top });
        setActiveValue({ price, unix });
      } else {
        // Reset active state
        setActivePoint(undefined);
        setActiveValue(undefined);
      }
    }, canvasElement);

    // Set labels
    setYLabels(
      priceLabels.map((price) => (
        <Label
          key={`${name}-${price.toString()}`}
          text={numberWithSignificantDigits(price)}
          top={toCanvasY(toGraphY(scalePriceY(price)))}
          left={0}
        />
      ))
    );
    setXLabels(
      dateLabels.map((unix) => (
        <Label
          key={`${name}-${unix}`}
          text={dayjs(unix).format(period.format)}
          top={graphDepth}
          left={toCanvasX(toGraphX(scaleUnixX(unix)))}
        />
      ))
    );

    // Set grid lines
    setXGridLines(
      dateLabels.map((unix) => (
        <VerticalGridLine
          key={`${name}-${unix}`}
          left={toCanvasX(toGraphX(scaleUnixX(unix)))}
        />
      ))
    );
    setYGridLines(
      priceLabels.map((price) => (
        <HorizontalGridLine
          key={`${name}-${price.toString()}`}
          top={toCanvasY(toGraphY(scalePriceY(price)))}
        />
      ))
    );
  }, [
    values,
    loading,
    canvasRef,
    change,
    name,
    width,
    period,
    colors,
    setActiveValue,
  ]);

  return (
    <div
      style={{ position: "relative", height: height + 24, userSelect: "none" }}
    >
      <Frame width={width} height={height} loading={loading}>
        {xGridLines}
        {yGridLines}
        {yLabels}
        {activePoint && (
          <>
            <ActiveLine left={activePoint.left} color={colors.COLOR} />
            <ActiveCircle
              size={16}
              left={activePoint.left}
              top={activePoint.top}
              color={colors.COLOR}
            />
          </>
        )}
        <canvas ref={canvasRef}></canvas>
      </Frame>
      {!loading && xLabels}
    </div>
  );
};
