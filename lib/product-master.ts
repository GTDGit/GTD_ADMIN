export interface MasterItem {
  id: number;
  name: string;
  displayOrder?: number;
}

type RawMasterItem = Partial<MasterItem> & {
  ID?: number;
  Name?: string;
  DisplayOrder?: number;
};

function normalizeMasterItem(item: RawMasterItem): MasterItem {
  return {
    id: item.id ?? item.ID ?? 0,
    name: item.name ?? item.Name ?? '',
    displayOrder: item.displayOrder ?? item.DisplayOrder ?? 0,
  };
}

export function normalizeMasterItems(items: unknown): MasterItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => normalizeMasterItem((item ?? {}) as RawMasterItem));
}
