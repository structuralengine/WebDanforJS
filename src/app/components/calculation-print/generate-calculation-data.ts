
import pako from "pako";

export function generateCalculationData(data: any): Promise<string> {
  const ui_data = data["ui_data"] as {};
  const lang = data["lang"] as string;
  const uid = data["uid"] as string;
  const print_calculate_checked = data["print_calculate_checked"] as boolean;
  const print_safety_ratio_checked = data["print_safety_ratio_checked"] as boolean;
  const print_section_force_checked = data["print_section_force_checked"] as boolean;
  const print_summary_table_checked = data["print_summary_table_checked"] as boolean;

  ui_data["lang"] = lang;
  ui_data["uid"] = uid;

  ui_data['calc']['print_calculate_checked'] = print_calculate_checked;
  ui_data['calc']['print_safety_ratio_checked'] = print_safety_ratio_checked;
  ui_data['calc']['print_section_force_checked'] = print_section_force_checked;
  ui_data['calc']['print_summary_table_checked'] = print_summary_table_checked;

  const jsonStr = JSON.stringify(ui_data);
  const jsonStrSize = getByteCount(jsonStr);
  console.log("jsonStr size = %d", jsonStrSize);
  const compressed = pako.gzip(jsonStr);
  const base64Encoded = base64Encode(compressed);

  return base64Encoded;
}

// https://qiita.com/i15fujimura1s/items/6fa5d16b1e53f04f3b06
function base64Encode(...parts: any[]): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const offset = result.indexOf(",") + 1;
      resolve(reader.result.slice(offset) as string);
    };
    reader.readAsDataURL(new Blob(parts));
  });
}

export function getByteCount(base64: string): number {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(base64);
  const bytes = encoded.byteLength;
  return bytes;
}
