import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

interface FormFieldProps {
	label: string;
	name: string;
	type?: "text" | "number" | "textarea";
	value: string | number;
	onChange: (value: string) => void;
	placeholder?: string;
	helperText?: string;
	maxLength?: number;
	required?: boolean;
	disabled?: boolean;
	rows?: number;
	min?: number;
	max?: number;
	className?: string;
}

export function FormField({
	label,
	name,
	type = "text",
	value,
	onChange,
	placeholder,
	helperText,
	maxLength,
	required,
	disabled,
	rows = 4,
	min,
	max,
	className,
}: FormFieldProps) {
	const charCount = typeof value === "string" ? value.length : 0;
	const showCounter = maxLength && type !== "number";

	return (
		<div className={cn("space-y-2", className)}>
			<Label htmlFor={name}>
				{label}
				{required && <span className="text-destructive ml-1">*</span>}
			</Label>

			{type === "textarea" ? (
				<Textarea
					id={name}
					name={name}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					maxLength={maxLength}
					required={required}
					disabled={disabled}
					rows={rows}
				/>
			) : (
				<Input
					id={name}
					name={name}
					type={type}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					maxLength={maxLength}
					required={required}
					disabled={disabled}
					min={min}
					max={max}
				/>
			)}

			<div className="flex justify-between">
				{helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
				{showCounter && (
					<p className="text-xs text-muted-foreground ml-auto">
						{charCount}/{maxLength}
					</p>
				)}
			</div>
		</div>
	);
}
