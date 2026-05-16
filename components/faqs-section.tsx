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
			"LinkArena is a simple, fast bookmark manager that helps you save, organize, and find your favorite links from anywhere.",
	},
	{
		id: "item-2",
		title: "How do I save a bookmark?",
		content:
			"Install our Chrome extension to save any page in one click, or paste a link directly into the web app. It only takes a second.",
	},
	{
		id: "item-3",
		title: "Will my bookmarks stay in sync across devices?",
		content:
			"Yes. Anything you save shows up instantly on all your devices and browser tabs, so you never have to refresh or wait.",
	},
	{
		id: "item-4",
		title: "Can I organize my bookmarks?",
		content:
			"Absolutely. Sort your links into groups, give them colors, drag to reorder, and search or filter to find anything in seconds.",
	},
	{
		id: "item-5",
		title: "Which browsers does LinkArena work with?",
		content:
			"You can use the web app in any modern browser. Our extension works in Chrome and other Chromium-based browsers like Edge, Brave, and Arc.",
	},
	{
		id: "item-6",
		title: "Is my data safe?",
		content:
			"Yes. Your bookmarks are private to your account, and you can export everything anytime you want a backup.",
	},
	{
		id: "item-7",
		title: "How do I get started?",
		content:
			"Just sign up for a free account, install the Chrome extension, and start saving. That's it — you're ready to go.",
	},
	{
		id: "item-8",
		title: "How do I get help?",
		content:
			"Reach out to our support team anytime, or browse the help center for quick answers and guides.",
	},
];
