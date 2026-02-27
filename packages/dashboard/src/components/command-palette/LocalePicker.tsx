import { Command } from "cmdk";

interface Locale {
	code: string;
	name: string;
	flag: string;
}

const LOCALES: Locale[] = [
	{ code: "en_US", name: "English (United States)", flag: "\u{1F1FA}\u{1F1F8}" },
	{ code: "en_GB", name: "English (United Kingdom)", flag: "\u{1F1EC}\u{1F1E7}" },
	{ code: "en_AU", name: "English (Australia)", flag: "\u{1F1E6}\u{1F1FA}" },
	{ code: "en_CA", name: "English (Canada)", flag: "\u{1F1E8}\u{1F1E6}" },
	{ code: "fr_FR", name: "French (France)", flag: "\u{1F1EB}\u{1F1F7}" },
	{ code: "fr_CA", name: "French (Canada)", flag: "\u{1F1E8}\u{1F1E6}" },
	{ code: "de_DE", name: "German (Germany)", flag: "\u{1F1E9}\u{1F1EA}" },
	{ code: "de_AT", name: "German (Austria)", flag: "\u{1F1E6}\u{1F1F9}" },
	{ code: "de_CH", name: "German (Switzerland)", flag: "\u{1F1E8}\u{1F1ED}" },
	{ code: "es_ES", name: "Spanish (Spain)", flag: "\u{1F1EA}\u{1F1F8}" },
	{ code: "es_MX", name: "Spanish (Mexico)", flag: "\u{1F1F2}\u{1F1FD}" },
	{ code: "es_AR", name: "Spanish (Argentina)", flag: "\u{1F1E6}\u{1F1F7}" },
	{ code: "it_IT", name: "Italian (Italy)", flag: "\u{1F1EE}\u{1F1F9}" },
	{ code: "pt_BR", name: "Portuguese (Brazil)", flag: "\u{1F1E7}\u{1F1F7}" },
	{ code: "pt_PT", name: "Portuguese (Portugal)", flag: "\u{1F1F5}\u{1F1F9}" },
	{ code: "ja_JP", name: "Japanese (Japan)", flag: "\u{1F1EF}\u{1F1F5}" },
	{ code: "ko_KR", name: "Korean (South Korea)", flag: "\u{1F1F0}\u{1F1F7}" },
	{ code: "zh_CN", name: "Chinese (Simplified)", flag: "\u{1F1E8}\u{1F1F3}" },
	{ code: "zh_TW", name: "Chinese (Traditional)", flag: "\u{1F1F9}\u{1F1FC}" },
	{ code: "zh_HK", name: "Chinese (Hong Kong)", flag: "\u{1F1ED}\u{1F1F0}" },
	{ code: "ar_SA", name: "Arabic (Saudi Arabia)", flag: "\u{1F1F8}\u{1F1E6}" },
	{ code: "hi_IN", name: "Hindi (India)", flag: "\u{1F1EE}\u{1F1F3}" },
	{ code: "ru_RU", name: "Russian (Russia)", flag: "\u{1F1F7}\u{1F1FA}" },
	{ code: "nl_NL", name: "Dutch (Netherlands)", flag: "\u{1F1F3}\u{1F1F1}" },
	{ code: "sv_SE", name: "Swedish (Sweden)", flag: "\u{1F1F8}\u{1F1EA}" },
	{ code: "da_DK", name: "Danish (Denmark)", flag: "\u{1F1E9}\u{1F1F0}" },
	{ code: "nb_NO", name: "Norwegian (Norway)", flag: "\u{1F1F3}\u{1F1F4}" },
	{ code: "fi_FI", name: "Finnish (Finland)", flag: "\u{1F1EB}\u{1F1EE}" },
	{ code: "pl_PL", name: "Polish (Poland)", flag: "\u{1F1F5}\u{1F1F1}" },
	{ code: "tr_TR", name: "Turkish (Turkey)", flag: "\u{1F1F9}\u{1F1F7}" },
	{ code: "th_TH", name: "Thai (Thailand)", flag: "\u{1F1F9}\u{1F1ED}" },
	{ code: "vi_VN", name: "Vietnamese (Vietnam)", flag: "\u{1F1FB}\u{1F1F3}" },
	{ code: "id_ID", name: "Indonesian (Indonesia)", flag: "\u{1F1EE}\u{1F1E9}" },
	{ code: "ms_MY", name: "Malay (Malaysia)", flag: "\u{1F1F2}\u{1F1FE}" },
	{ code: "uk_UA", name: "Ukrainian (Ukraine)", flag: "\u{1F1FA}\u{1F1E6}" },
	{ code: "cs_CZ", name: "Czech (Czech Republic)", flag: "\u{1F1E8}\u{1F1FF}" },
	{ code: "ro_RO", name: "Romanian (Romania)", flag: "\u{1F1F7}\u{1F1F4}" },
	{ code: "hu_HU", name: "Hungarian (Hungary)", flag: "\u{1F1ED}\u{1F1FA}" },
	{ code: "el_GR", name: "Greek (Greece)", flag: "\u{1F1EC}\u{1F1F7}" },
	{ code: "he_IL", name: "Hebrew (Israel)", flag: "\u{1F1EE}\u{1F1F1}" },
	{ code: "ca_ES", name: "Catalan (Spain)", flag: "\u{1F1EA}\u{1F1F8}" },
	{ code: "hr_HR", name: "Croatian (Croatia)", flag: "\u{1F1ED}\u{1F1F7}" },
	{ code: "sk_SK", name: "Slovak (Slovakia)", flag: "\u{1F1F8}\u{1F1F0}" },
	{ code: "bg_BG", name: "Bulgarian (Bulgaria)", flag: "\u{1F1E7}\u{1F1EC}" },
];

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

	if (filtered.length === 0) {
		return (
			<div className="flex items-center justify-center py-8 text-text-muted text-sm">
				No matching locales
			</div>
		);
	}

	return (
		<Command.Group heading="Locales">
			{filtered.map((locale) => (
				<Command.Item
					key={locale.code}
					value={`${locale.name} ${locale.code}`}
					onSelect={() => onSelect(locale.code)}
				>
					<span className="text-base mr-1">{locale.flag}</span>
					<div className="cmdk-item-text">
						<span>{locale.name}</span>
						<span className="cmdk-item-description">{locale.code}</span>
					</div>
				</Command.Item>
			))}
		</Command.Group>
	);
}
