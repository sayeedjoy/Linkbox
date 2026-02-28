import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type React from "react";
import {
	BookmarkPlus,
	Link2,
	FolderKanban,
	Search,
	RefreshCw,
	FileDown,
} from "lucide-react";
import { DecorIcon } from "@/components/ui/decor-icon";

const FeatureIconVariants = cva(
	"pointer-events-none shrink-0 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
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
			tone: "muted",
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
				Core capabilities
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
							<FeatureIcon size="md" tone="muted">
								{feature.icon}
							</FeatureIcon>
							<h3 className="font-medium text-lg">{feature.title}</h3>
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
		title: "Save links & notes",
		icon: <BookmarkPlus />,
		description: "Paste URLs or type notes. Save links and notes instantly.",
	},
	{
		title: "Auto-unfurl metadata",
		icon: <Link2 />,
		description: "Title, description, favicon, and preview image pulled automatically.",
	},
	{
		title: "Groups & organize",
		icon: <FolderKanban />,
		description: "Group bookmarks with color and ordering. Reorder and manage your collection.",
		hideConnector: true,
	},
	{
		title: "Search & timeline",
		icon: <Search />,
		description: "Search and timeline views for quick discovery.",
	},
	{
		title: "Realtime sync",
		icon: <RefreshCw />,
		description: "SSE keeps web app and extension in sync across active clients.",
	},
	{
		title: "Edit, export & delete",
		icon: <FileDown />,
		description: "Edit, refresh metadata, delete bookmarks. Export anytime.",
		hideConnector: true,
	},
];
