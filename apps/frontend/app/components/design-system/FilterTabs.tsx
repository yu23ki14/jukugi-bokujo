import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";

interface FilterOption {
	value: string;
	label: string;
	count?: number;
}

interface FilterTabsProps {
	options: FilterOption[];
	value: string;
	onChange: (value: string) => void;
}

export function FilterTabs({ options, value, onChange }: FilterTabsProps) {
	return (
		<Tabs value={value} onValueChange={onChange}>
			<TabsList>
				{options.map((option) => (
					<TabsTrigger key={option.value} value={option.value}>
						{option.label}
						{option.count !== undefined && <span className="ml-1 text-xs">({option.count})</span>}
					</TabsTrigger>
				))}
			</TabsList>
		</Tabs>
	);
}
