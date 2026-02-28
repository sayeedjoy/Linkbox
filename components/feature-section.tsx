import { cn } from "@/lib/utils";
import type React from "react";
import { DecorIcon } from "@/components/ui/decor-icon";
import { HistoryIcon, SquareDashedIcon, CommandIcon } from "lucide-react";

type FeatureType = {
	title: string;
	icon: React.ReactNode;
	description: string;
};

export function FeatureSection() {
	return (
		<div className="mx-auto max-w-5xl">
			<h2 id="features" className="mb-5 text-center font-medium text-2xl md:text-3xl">
				Built for your workflow
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

				<div className="grid grid-cols-1 md:grid-cols-3">
					{features.map((feature) => (
						<div
							className="group [&_svg]:mask-b-from-0% relative p-8 [&_svg]:size-7 [&_svg]:text-muted-foreground"
							key={feature.title}
						>
							{feature.icon}
							<h3 className="font-medium text-lg">{feature.title}</h3>
							<p className="text-muted-foreground text-sm leading-relaxed">
								{feature.description}
							</p>
							<DashedLine className="right-5 bottom-0 left-5 group-last:hidden md:top-5 md:right-0 md:bottom-5 md:left-full" />
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
		icon: <HistoryIcon />,
		description: "Paste URLs or type notes. Auto-unfurl metadata, favicon, and preview images.",
	},
	{
		title: "Groups & organize",
		icon: <SquareDashedIcon />,
		description: "Organize bookmarks with colored groups. Reorder and manage your collection.",
	},
	{
		title: "Keyboard shortcuts",
		icon: <CommandIcon />,
		description: "Quick capture and navigation with keyboard shortcuts.",
	},
];
