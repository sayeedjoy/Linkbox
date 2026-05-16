import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type React from "react";
import {
	BookmarkPlus,
	Sparkles,
	FolderKanban,
	Search,
	RefreshCw,
	Chrome,
	Smartphone,
	DownloadCloud,
	ShieldCheck,
} from "lucide-react";
import { DecorIcon } from "@/components/ui/decor-icon";

const FeatureIconVariants = cva(
	"pointer-events-none shrink-0 [&_svg]:shrink-0",
	{
		variants: {
			size: {
				sm: "[&_svg]:size-6",
				md: "[&_svg]:size-8",
				lg: "[&_svg]:size-10",
			},
			tone: {
				muted: "[&_svg]:text-muted-foreground",
				default: "[&_svg]:text-foreground",
			},
		},
		defaultVariants: {
			size: "md",
		},
	}
);

type FeatureIconProps = VariantProps<typeof FeatureIconVariants> & {
	children: React.ReactNode;
	className?: string;
};

function FeatureIcon({ size, tone, className, children }: FeatureIconProps) {
	return (
		<span className={cn(FeatureIconVariants({ size, tone, className }))}>
			{children}
		</span>
	);
}

type FeatureType = {
	title: string;
	icon: React.ReactNode;
	description: string;
	hideConnector?: boolean;
};

export function FeatureSection() {
	return (
		<div className="mx-auto max-w-5xl">
			<h2 id="features" className="mb-5 text-center font-medium text-2xl md:text-3xl">
				Core Features
			</h2>

			<div className="relative">
				{/* Corner Icons */}
				<DecorIcon
					className="size-6 stroke-2 stroke-border"
					position="top-left"
				/>
				<DecorIcon
					className="size-6 stroke-2 stroke-border"
					position="top-right"
				/>
				<DecorIcon
					className="size-6 stroke-2 stroke-border"
					position="bottom-left"
				/>
				<DecorIcon
					className="size-6 stroke-2 stroke-border"
					position="bottom-right"
				/>

				<DashedLine className="-top-[1.5px] right-3 left-3" />
				<DashedLine className="top-3 -right-[1.5px] bottom-3" />
				<DashedLine className="top-3 bottom-3 -left-[1.5px]" />
				<DashedLine className="right-3 -bottom-[1.5px] left-3" />

				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
					{features.map((feature) => (
						<div
							className="group relative p-8"
							key={feature.title}
						>
							<FeatureIcon size="md">
								{feature.icon}
							</FeatureIcon>
							<h3 className="mt-3 font-medium text-lg">{feature.title}</h3>
							<p className="text-muted-foreground text-sm leading-relaxed">
								{feature.description}
							</p>
							{!feature.hideConnector && (
								<DashedLine className="right-5 bottom-0 left-5 md:top-5 md:right-0 md:bottom-5 md:left-full" />
							)}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

function DashedLine({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("absolute border-collapse border border-dashed", className)}
			{...props}
		/>
	);
}

const features: FeatureType[] = [
	{
		title: "Save in a click",
		icon: <BookmarkPlus className="text-primary" />,
		description: "Drop a link or note. We fill in the rest.",
	},
	{
		title: "Smart auto-sorting",
		icon: <Sparkles className="text-primary" />,
		description: "New saves land in the right group on their own.",
	},
	{
		title: "Groups you can shape",
		icon: <FolderKanban className="text-primary" />,
		description: "Make groups, pick colours, drag to reorder.",
		hideConnector: true,
	},
	{
		title: "Find anything fast",
		icon: <Search className="text-primary" />,
		description: "Search or scroll the timeline to find a link.",
	},
	{
		title: "Always in sync",
		icon: <RefreshCw className="text-primary" />,
		description: "Save once, see it on every device instantly.",
	},
	{
		title: "Browser extension",
		icon: <Chrome className="text-primary" />,
		description: "Save the page you're on in a single click.",
		hideConnector: true,
	},
	{
		title: "Bring your bookmarks",
		icon: <DownloadCloud className="text-primary" />,
		description: "Import your browser bookmarks in seconds.",
	},
	{
		title: "On your phone too",
		icon: <Smartphone className="text-primary" />,
		description: "Your library, ready in your pocket.",
	},
	{
		title: "Private and secure",
		icon: <ShieldCheck className="text-primary" />,
		description: "Your links stay yours. Always.",
		hideConnector: true,
	},
];
