import type {ButtonHTMLAttributes} from 'react';
export function Button({className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>){return <button {...props} className={`btn btn-primary ${className}`} />;}
