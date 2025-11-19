'use client';

import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";

export function TextField({ 
  id, 
  label, 
  description, 
  type = "text",
  value, 
  onChange, 
  placeholder,
  required = false 
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-white">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </Label>
      {description && <p className="text-sm text-gray-400">{description}</p>}
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

export function TextareaField({ 
  id, 
  label, 
  description, 
  value, 
  onChange, 
  placeholder,
  maxLength,
  required = false 
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-white">
          {label}{required && <span className="text-red-400 ml-1">*</span>}
        </Label>
        {maxLength && (
          <span className="text-xs text-gray-400">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      {description && <p className="text-sm text-gray-400">{description}</p>}
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        required={required}
      />
    </div>
  );
}

export function SwitchField({ 
  id, 
  label, 
  description, 
  checked, 
  onCheckedChange 
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5 flex-1">
        <Label htmlFor={id} className="text-white">{label}</Label>
        {description && (
          <p className="text-sm text-gray-400">{description}</p>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
