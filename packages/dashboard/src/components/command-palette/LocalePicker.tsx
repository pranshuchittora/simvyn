import { Command } from "cmdk";
import { LOCALES } from "../../data/locales";

interface LocalePickerProps {
	search: string;
	onSelect: (localeCode: string) => void;
}

export default function LocalePicker({ search, onSelect }: LocalePickerProps) {
	const query = search.toLowerCase().trim();
	const filtered = query
		? LOCALES.filter(
				(l) => l.name.toLowerCase().includes(query) || l.code.toLowerCase().includes(query),
			)
		: LOCALES;

	const shown = filtered.slice(0, 50);

	if (filtered.length === 0) {
		return (
			<div className="flex items-center justify-center py-8 text-text-muted text-sm">
				No matching locales
			</div>
		);
	}

	return (
		<Command.Group
			heading={`Locales${filtered.length > 50 ? ` (showing 50 of ${filtered.length})` : ""}`}
		>
			{shown.map((locale) => (
				<Command.Item
					key={locale.code}
					value={`${locale.name} ${locale.code}`}
					onSelect={() => onSelect(locale.code)}
				>
					<div className="cmdk-item-text">
						<span>{locale.name}</span>
						<span className="cmdk-item-description">{locale.code}</span>
					</div>
				</Command.Item>
			))}
		</Command.Group>
	);
}
