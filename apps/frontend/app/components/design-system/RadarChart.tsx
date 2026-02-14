import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

export interface RadarAxis {
	key: string;
	label: string;
	description: string;
}

interface RadarChartProps {
	axes: RadarAxis[];
	data: Record<string, number | undefined>;
	maxValue?: number;
}

const SIZE = 300;
const CENTER = SIZE / 2;
const RADIUS = 100;
const LABEL_RADIUS = 128;
const GRID_LEVELS = 5;

function polarToCartesian(angle: number, radius: number): { x: number; y: number } {
	const rad = angle - Math.PI / 2;
	return {
		x: CENTER + radius * Math.cos(rad),
		y: CENTER + radius * Math.sin(rad),
	};
}

function buildPolygonPoints(count: number, radius: number): string {
	const step = (2 * Math.PI) / count;
	return Array.from({ length: count }, (_, i) => {
		const { x, y } = polarToCartesian(i * step, radius);
		return `${x},${y}`;
	}).join(" ");
}

/** Determine CSS transform so the label extends away from the chart center. */
function getLabelTransform(x: number, y: number): string {
	const dx = x - CENTER;
	const dy = y - CENTER;

	let tx = "-50%";
	if (dx > 15) tx = "0%";
	else if (dx < -15) tx = "-100%";

	let ty = "-50%";
	if (dy > 30) ty = "0%";
	else if (dy < -30) ty = "-100%";

	return `translate(${tx}, ${ty})`;
}

/**
 * Pure SVG radar chart with dynamic axis count.
 * Labels are placed at each vertex with Popover for descriptions.
 */
export function RadarChart({ axes, data, maxValue = 10 }: RadarChartProps) {
	const activeAxes = axes.filter((a) => data[a.key] != null);
	const count = activeAxes.length;

	if (count < 3) return null;

	const step = (2 * Math.PI) / count;

	const dataPoints = activeAxes.map((axis, i) => {
		const value = Math.min(data[axis.key] ?? 0, maxValue);
		const r = (value / maxValue) * RADIUS;
		return polarToCartesian(i * step, r);
	});
	const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

	return (
		<div className="relative mx-auto w-full max-w-[280px] overflow-visible">
			<svg
				viewBox={`0 0 ${SIZE} ${SIZE}`}
				className="w-full block"
				role="img"
				aria-label="レーダーチャート"
			>
				{/* Grid polygons */}
				{[1, 2, 3, 4, 5].map((level) => {
					const r = (level / GRID_LEVELS) * RADIUS;
					return (
						<polygon
							key={`grid-${level}`}
							points={buildPolygonPoints(count, r)}
							fill="none"
							className="stroke-border"
							strokeWidth={level === GRID_LEVELS ? 1.5 : 0.5}
						/>
					);
				})}

				{/* Axis lines */}
				{activeAxes.map((axis) => {
					const idx = activeAxes.indexOf(axis);
					const { x, y } = polarToCartesian(idx * step, RADIUS);
					return (
						<line
							key={`axis-${axis.key}`}
							x1={CENTER}
							y1={CENTER}
							x2={x}
							y2={y}
							className="stroke-border"
							strokeWidth={0.5}
						/>
					);
				})}

				{/* Data polygon */}
				<polygon points={dataPolygon} className="fill-primary/20 stroke-primary" strokeWidth={2} />

				{/* Data points */}
				{dataPoints.map((p, i) => (
					<circle
						key={`point-${activeAxes[i].key}`}
						cx={p.x}
						cy={p.y}
						r={4}
						className="fill-primary"
					/>
				))}
			</svg>

			{/* Vertex labels (HTML overlay for Popover support) */}
			{activeAxes.map((axis, i) => {
				const pos = polarToCartesian(i * step, LABEL_RADIUS);
				const score = data[axis.key] ?? 0;
				const leftPct = (pos.x / SIZE) * 100;
				const topPct = (pos.y / SIZE) * 100;

				return (
					<Popover key={axis.key}>
						<PopoverTrigger asChild>
							<button
								type="button"
								className="absolute whitespace-nowrap text-xs leading-tight transition-colors hover:text-primary"
								style={{
									left: `${leftPct}%`,
									top: `${topPct}%`,
									transform: getLabelTransform(pos.x, pos.y),
								}}
							>
								<span className="text-muted-foreground">{axis.label}</span>
								<span className="ml-0.5 font-bold text-primary">{score}</span>
							</button>
						</PopoverTrigger>
						<PopoverContent className="w-60">
							<p className="font-semibold mb-1">
								{axis.label}: {score} / {maxValue}
							</p>
							<p className="text-sm text-muted-foreground">{axis.description}</p>
						</PopoverContent>
					</Popover>
				);
			})}
		</div>
	);
}
