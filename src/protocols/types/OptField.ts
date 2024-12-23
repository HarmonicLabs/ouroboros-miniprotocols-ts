
export type OptField<T, FieldName extends keyof T> = Omit<T, FieldName> & Partial<Pick<T, FieldName>>;