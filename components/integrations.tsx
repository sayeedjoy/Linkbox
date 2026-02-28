import { cn } from "@/lib/utils";
import { DecorIcon } from "@/components/ui/decor-icon";

type Integration = {
	src: string;
	name: string;
	description: string;
	isInvertable?: boolean;
	icon?: React.ReactNode;
};

const data: Integration[] = [
	{
		src: "https://storage.efferd.com/logo/vercel.svg",
		name: "Next.js",
		description: "Full-stack web app for managing bookmarks.",
		isInvertable: true,
	},
	{
		src: "https://storage.efferd.com/logo/openai.svg",
		name: "Chrome Extension",
		description: "Quick capture from browser popup or context menu.",
		isInvertable: true,
		icon: <DecorIcon position="bottom-left" />,
	},
	{
		src: "https://storage.efferd.com/logo/supabase.svg",
		name: "PostgreSQL",
		description: "Reliable storage with Prisma ORM.",
	},
	{
		src: "https://storage.efferd.com/logo/github.svg",
		name: "Realtime sync",
		description: "SSE stream keeps all clients in sync.",
		isInvertable: true,
	},
	{
		src: "https://storage.efferd.com/logo/notion.svg",
		name: "Groups",
		description: "Organize with colored groups and ordering.",
	},
	{
		src: "https://storage.efferd.com/logo/gmail.svg",
		name: "Export",
		description: "Export bookmarks anytime.",
		icon: <DecorIcon position="top-left" />,
	},
];

export function Integrations() {
	return (
		<div className="relative mx-auto max-w-5xl border">
			<div className="grid grid-cols-2 gap-px bg-border md:grid-cols-3">
				{data.map((item) => (
					<IntegrationCard integration={item} key={item.name}>
						{item.icon}
					</IntegrationCard>
				))}
			</div>
			<DecorIcon position="top-left" />
			<DecorIcon position="top-right" />
			<DecorIcon position="bottom-left" />
			<DecorIcon position="bottom-right" />
		</div>
	);
}

function IntegrationCard({
	integration,
	className,
	children,
	...props
}: React.ComponentProps<"div"> & {
	integration: Integration;
}) {
	return (
		<div
			className={cn(
				"relative flex flex-col items-start gap-4 bg-background p-4 text-start md:p-6 md:even:bg-background/75",
				className
			)}
			{...props}
		>
			<img
				alt={integration.name}
				className={cn(
					"pointer-events-none size-8 shrink-0 select-none object-contain",
					integration.isInvertable && "dark:invert"
				)}
				height={32}
				src={integration.src}
				width={32}
			/>
			<div className="space-y-1">
				<h3 className="font-semibold">{integration.name}</h3>
				<p className="text-muted-foreground text-xs md:text-sm">
					{integration.description}
				</p>
			</div>
			{children}
		</div>
	);
}
