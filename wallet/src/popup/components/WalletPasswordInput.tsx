import type { JSX, KeyboardEvent } from "react";
import { useEffect, useRef } from "react";
import { hardenSensitiveTextInput, hardenWalletPasswordInput } from "../lib/password-input";

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (ev: KeyboardEvent<HTMLInputElement>) => void;
};

export function WalletPasswordInput({
  id,
  value,
  onChange,
  placeholder,
  className = "wallet-pwd-masked",
  onKeyDown,
}: Props): JSX.Element {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) hardenWalletPasswordInput(ref.current);
  }, []);
  return (
    <input
      ref={ref}
      id={id}
      type="text"
      className={className}
      placeholder={placeholder}
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
    />
  );
}

export function SensitiveTextArea({
  id,
  value,
  onChange,
  placeholder,
  rows = 4,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}): JSX.Element {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) hardenSensitiveTextInput(ref.current);
  }, []);
  return (
    <textarea
      ref={ref}
      id={id}
      className={className}
      rows={rows}
      placeholder={placeholder}
      autoComplete="off"
      spellCheck={false}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function SensitiveTextInput({
  id,
  value,
  onChange,
  placeholder,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}): JSX.Element {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) hardenSensitiveTextInput(ref.current);
  }, []);
  return (
    <input
      ref={ref}
      id={id}
      type="text"
      className={className}
      placeholder={placeholder}
      autoComplete="off"
      spellCheck={false}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
