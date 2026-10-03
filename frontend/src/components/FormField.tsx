import {useId} from 'react';import type {InputHTMLAttributes} from 'react';
export function FormField({label,...props}:InputHTMLAttributes<HTMLInputElement>&{label:string}){const id=useId();return <div className="form-row"><label htmlFor={id}>{label}</label><input {...props} id={id}/></div>;}
