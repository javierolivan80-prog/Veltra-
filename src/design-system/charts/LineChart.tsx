import { useEffect } from "react";
import { View, Text as RNText } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";
import Animated, { useAnimatedProps, useSharedValue, withTiming, Easing } from "react-native-reanimated";
import { colors } from "@/src/design-system/colors";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ChartPoint {
  x: string;
  y: number;
}

interface LineChartProps {
  data: ChartPoint[];
  color?: string;
  height?: number;
  formatValue?: (v: number) => string;
  formatX?: (v: string, index: number) => string;
  predictedY?: number;
}

function catmullRomPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function LineChart({ data, color = colors.progress.DEFAULT, height = 220, formatValue, formatX, predictedY }: LineChartProps) {
  const width = 340; // scaled by parent via viewBox
  const paddingX = 16;
  const paddingTop = 28;
  const paddingBottom = 28;

  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.value = 0;
    reveal.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [data.length]);

  // Hooks must run unconditionally on every render, so these are declared
  // before the empty-data early return below even though they're only used
  // once there's a path to animate.
  const areaProps = useAnimatedProps(() => ({ opacity: reveal.value }));
  const lineProps = useAnimatedProps(() => ({ opacity: reveal.value }));

  if (data.length === 0) {
    return (
      <View style={{ height }} className="items-center justify-center">
        <RNText className="text-ink-faint text-sm font-body">Todavía no hay datos suficientes</RNText>
      </View>
    );
  }

  const values = data.map((d) => d.y);
  const allValues = predictedY !== undefined ? [...values, predictedY] : values;
  const minY = Math.min(...allValues);
  const maxY = Math.max(...allValues);
  const rangeY = maxY - minY || 1;
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingX * 2;

  const points = data.map((d, i) => ({
    x: paddingX + (data.length === 1 ? chartWidth / 2 : (i / (data.length - 1)) * chartWidth),
    y: paddingTop + chartHeight - ((d.y - minY) / rangeY) * chartHeight,
  }));

  const linePath = catmullRomPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;

  const last = points[points.length - 1];
  const predictedPoint =
    predictedY !== undefined
      ? { x: Math.min(width - paddingX, last.x + chartWidth * 0.18), y: paddingTop + chartHeight - ((predictedY - minY) / rangeY) * chartHeight }
      : null;

  const gridLines = [0.25, 0.5, 0.75].map((f) => paddingTop + chartHeight * f);

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.32} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {gridLines.map((y, i) => (
          <Line key={i} x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke={colors.line.subtle} strokeWidth={1} />
        ))}

        <AnimatedPath d={areaPath} fill="url(#areaFill)" animatedProps={areaProps} />
        <AnimatedPath d={linePath} stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" animatedProps={lineProps} />

        {predictedPoint ? (
          <Path
            d={`M ${last.x} ${last.y} L ${predictedPoint.x} ${predictedPoint.y}`}
            stroke={color}
            strokeWidth={2}
            strokeDasharray="5,5"
            fill="none"
            opacity={0.55}
          />
        ) : null}
        {predictedPoint ? <Circle cx={predictedPoint.x} cy={predictedPoint.y} r={4} fill="none" stroke={color} strokeWidth={2} opacity={0.7} /> : null}

        {points.map((p, i) =>
          i === points.length - 1 ? null : <Circle key={i} cx={p.x} cy={p.y} r={2.5} fill={colors.bg.DEFAULT} stroke={color} strokeWidth={1.5} opacity={0.6} />
        )}
        <AnimatedCircle cx={last.x} cy={last.y} r={5} fill={color} />
      </Svg>

      <View className="flex-row justify-between px-1 -mt-2">
        <RNText className="text-ink-faint text-[11px] font-body">{formatX ? formatX(data[0].x, 0) : data[0].x}</RNText>
        <RNText className="text-ink-faint text-[11px] font-body">{formatX ? formatX(data[data.length - 1].x, data.length - 1) : data[data.length - 1].x}</RNText>
      </View>
    </View>
  );
}
