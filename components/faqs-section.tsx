import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

export function FaqsSection() {
	return (
		<div className="mx-auto w-full max-w-3xl space-y-7 px-4 pt-16">
			<div className="space-y-2">
				<h2 className="font-semibold text-3xl md:text-4xl">
					Frequently Asked Questions
				</h2>
				<p className="max-w-2xl text-muted-foreground">
					Here are some common questions and answers about LinkArena. If you
					don't find the answer you're looking for, feel free to reach out.
				</p>
			</div>
			<Accordion
				className="w-full -space-y-px rounded-lg bg-card shadow dark:bg-card/50"
				collapsible
				defaultValue="item-1"
				type="single"
			>
				{questions.map((item) => (
					<AccordionItem
						className="relative border-x first:rounded-t-lg first:border-t last:rounded-b-lg last:border-b"
						key={item.id}
						value={item.id}
					>
						<AccordionTrigger className="px-4 py-4 text-[15px] leading-6 hover:no-underline">
							{item.title}
						</AccordionTrigger>
						<AccordionContent className="px-4 pb-4 text-muted-foreground">
							{item.content}
						</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>
			
		</div>
	);
}

const questions = [
	{
		id: "item-1",
		title: "What is LinkArena?",
		content:
			"LinkArena is a superfast bookmark manager with a web app and Chrome extension. Save links, auto-unfurl metadata, organize with groups, and sync everywhere in real time.",
	},
	{
		id: "item-2",
		title: "How do I capture bookmarks quickly?",
		content:
			"Install the Chrome extension for one-click capture from the popup or right-click context menu. Or add links directly from the web dashboard.",
	},
	{
		id: "item-3",
		title: "How does realtime sync work?",
		content:
			"LinkArena uses Server-Sent Events to keep all your devices and browser tabs in sync. Add or edit a bookmark anywhere and it updates everywhere instantly.",
	},
	{
		id: "item-4",
		title: "Can I organize my bookmarks?",
		content:
			"Yes. Create groups, assign colors, reorder bookmarks, and use the dashboard to search and filter. Export your bookmarks anytime.",
	},
	{
		id: "item-5",
		title: "Does LinkArena integrate with other tools?",
		content:
			"LinkArena is built with Next.js, PostgreSQL, and Prisma. The extension works in Chrome and Chromium-based browsers.",
	},
	{
		id: "item-6",
		title: "How do I get support?",
		content:
			"Contact our customer support team or check the help center for guides and troubleshooting.",
	},
	{
		id: "item-7",
		title: "How do I get started?",
		content:
			"Sign up for an account, install the Chrome extension, and start saving bookmarks. Your data syncs automatically across all devices.",
	},
];
