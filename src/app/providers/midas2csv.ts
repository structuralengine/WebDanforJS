import * as XLSX from "xlsx";

type MidasData4 = {
  [
    /** 着目断面力(mark) */
    key: string
  ]: {
    fx: number;
    fy: number;
    fz: number;
    mx: number;
    my: number;
    mz: number;
    /** 最初に見つかった成分を特定するための通し番号(欠落した成分を補完する際に使用する) */
    seq: number;
  };
};
type MidasData3 = {
  [
    /** 最大or最小(maxmin) */
    key: string
  ]: MidasData4;
};
type MidasData2 = {
  [
    /** 着目点(p_id) */
    key: string
  ]: MidasData3;
};
type MidasData1 = {
  [
    /** 部材番号(m_no) */
    key: number
  ]: MidasData2;
};
/** Midasデータ(Excelファイル)から読み出したデータを格納するオブジェクトの型情報 */
type MidasData = {
  [
    /** ピックアップ番号(pickupNo) */
    key: number
  ]: MidasData1;
};

/** cvs出力用の行データの型情報 */
type CsvLine = {
  pickupNo: number;
  mark: string;
  m_no: number;
  // maxComb: string,
  // minComb: string,
  p_id: string;
  // position: number,
  max: {
    fx: number;
    fy: number;
    fz: number;
    mx: number;
    my: number;
    mz: number;
  } | null;
  min: {
    fx: number;
    fy: number;
    fz: number;
    mx: number;
    my: number;
    mz: number;
  } | null;
};

/**
 * Midasのピックアップデータをcsv形式の文字列に変換する
 * @param wb Midasのピックアップデータ(Excel Workbook)
 * @returns csv形式の文字列
 */
export function midas2csv(wb: XLSX.WorkBook): string {
  // シートが含まれていなければ何もしない
  if (wb.SheetNames.length === 0) {
    return "";
  }
  // Excel読込み
  const data = step1(wb);
  // 欠損データの補完
  step2(data);
  // データ構造の変更
  const array = step3(data);
  // csv形式の文字列に変換
  const csv = step4(array);
  // console.log(csv);
  return csv;
}

/**
 * Midasのピックアップデータを読み込んでMidasData型オブジェクトに格納する
 * @param wb Midasのピックアップデータ(Excel Workbook)
 * @returns MidasData型オブジェクト
 */
function step1(wb: XLSX.WorkBook): MidasData {
  /** 結果格納先 */
  const data: MidasData = {};
  /** ピックアップ番号と荷重名の関連付けのための辞書。キーは荷重名、値はピックアップ番号 */
  const pickupNoDict: {
    [
      /** 荷重名(loadName) */
      key: string
    ]: number;
  } = {};
  // データ行の連番(みたいなもの)
  let seq = 0;
  // モーメント値の単位変換係数
  let mxCoef: number | null = 1;
  let myCoef: number | null = 1;
  let mzCoef: number | null = 1;
  for (const [sheetName, sheetIndex] of wb.SheetNames.map((v, i) => [v, i])) {
    const sheet = wb.Sheets[sheetName];
    // シートの内容をJSONデータの配列に変換する。参考URL: https://www.npmjs.com/package/xlsx#json
    const jsonLines = XLSX.utils.sheet_to_json(sheet, {
      raw: false, // 生値ではなくて整形済みの値(文字列)を出力する
      header: "A", // 各列のJSONキーを英大文字にする
      defval: null, // 空セルに対してnullを出力する
    });
    // 先頭シートは3行目以降がデータ、以降のシートは2行目以降
    const skipLines = sheetIndex === 0 ? 2 : 1;
    if (sheetIndex === 0) {
      // 先頭シートの1行目の空行が無視されている(はず)ので、読み込んだデータの先頭行が見出し行で、それを削除すればデータ行だけが残る
      const columnHeaders = jsonLines.splice(0, 1)[0];
      // モーメント値の単位変換係数を決定
      mxCoef = getMomentCoef(columnHeaders["O"]);
      myCoef = getMomentCoef(columnHeaders["P"]);
      mzCoef = getMomentCoef(columnHeaders["Q"]);
      if (mxCoef === null || myCoef === null || mzCoef === null) {
        throw new Error(`unexpected moment unit (${sheetName}, 2)`); // モーメント値の単位表記が抽出できない
      }
    } else {
      // 不要な行を削除(読み込んだデータの1行目だけが不要な行)
      jsonLines.splice(0, 1);
    }
    // 空行がスキップされるので、場合によっては行番号(lineNumber)が狂うことに注意
    for (const [columns, lineNumber] of jsonLines.map((v, i) => [
      v,
      i + 1 + skipLines,
    ])) {
      // 部材番号
      const m_no = extractElementInfo(columns["D"]);
      if (m_no === null) {
        continue; // 部材番号が抽出できない
      }
      // 荷重名、最大or最小
      const { loadName, maxmin } = extractLoadInfo(columns["E"]);
      if (loadName === null || maxmin === null) {
        continue; // 荷重名もしくは(最大)(最小)が抽出できない
      }
      // ピックアップ番号
      let pickupNo: number;
      if (loadName in pickupNoDict) {
        pickupNo = pickupNoDict[loadName];
      } else {
        pickupNo = Object.keys(pickupNoDict).length + 1;
        pickupNoDict[loadName] = pickupNo;
      }
      // 着目点
      const p_id = extractPositionInfo(columns["I"]);
      if (p_id === null) {
        continue; // 着目点が抽出できない
      }
      // 着目断面力
      const mark = extractTypeInfo(columns["K"]);
      if (mark === null) {
        continue; // 着目断面力が抽出できない
      }
      // 各断面力。数値に変換できなければゼロを設定する
      const fx = toNumber(columns["L"]) ?? 0;
      const fy = toNumber(columns["M"]) ?? 0;
      const fz = toNumber(columns["N"]) ?? 0;
      const mx = (toNumber(columns["O"]) ?? 0) * mxCoef;
      const my = (toNumber(columns["P"]) ?? 0) * myCoef;
      const mz = (toNumber(columns["Q"]) ?? 0) * mzCoef;

      const key1 = pickupNo;
      if (!(key1 in data)) {
        data[key1] = {};
      }
      const data1 = data[key1];

      const key2 = m_no;
      if (!(key2 in data1)) {
        data1[key2] = {};
      }
      const data2 = data1[key2];

      const key3 = p_id;
      if (!(key3 in data2)) {
        data2[key3] = {};
      }
      const data3 = data2[key3];

      const key4 = maxmin;
      if (!(key4 in data3)) {
        data3[key4] = {};
      }
      const data4 = data3[key4];

      const key5 = mark;
      if (key5 in data4) {
        throw new Error(`duplicated mark (${sheetName}, ${lineNumber})`); // 着目断面力(mark)の重複
      }
      data4[key5] = { fx, fy, fz, mx, my, mz, seq };

      seq += 1;
    }
  }
  return data;
}
/**
 * モーメント値の列の列見出しの単位表記を参照して、モーメント値をkN·mに換算するための係数を取得する。取得できない場合はnull
 * @param header モーメント値の列の列見出し
 * @returns モーメント値をkN·mに換算するための係数
 */
function getMomentCoef(header: string | null): number | null {
  if (header !== null) {
    const unit = header.split(/\n/)[1];
    switch (unit) {
      case "(kN·cm)":
        return 0.01;
      case "(kN·m)":
        return 1;
      default:
        break;
    }
  }
  return null;
}
/**
 * D列のデータ(要素)から部材番号(m_no)を抽出する。抽出できない場合はnull
 * @param value D列のデータ(要素)
 * @returns 部材番号(m_no)
 */
function extractElementInfo(value: string | null): number | null {
  let num = toNumber(value);
  if (num < 1 || !Number.isInteger(num)) {
    num = null;
  }
  return num;
}
/**
 * E列のデータ(荷重)から荷重名(loadName)と最大or最小(maxmin)を抽出する。抽出できないデータはnull
 * @param value E列のデータ(荷重)
 * @returns 荷重名(loadName)と最大or最小(maxmin)
 */
function extractLoadInfo(value: string | null): {
  loadName: string | null;
  maxmin: "max" | "min" | null;
} {
  let loadName: string | null = null;
  let maxmin: "max" | "min" | null = null;
  if (value !== null) {
    const elms = /^\s*(.+)\s*(\(最[大小]\))\s*$/.exec(value);
    loadName = elms[1];
    switch (elms[2]) {
      case "(最大)":
        maxmin = "max";
        break;
      case "(最小)":
        maxmin = "min";
        break;
      default:
        break;
    }
  }
  return { loadName, maxmin };
}
/**
 * K列のデータ(成分)から着目断面力の種別(mark)を抽出する。抽出できない場合はnull
 * @param value K列のデータ(成分)
 * @returns 着目断面力の種別(mark)
 */
function extractTypeInfo(
  value: string | null
): "fx" | "fy" | "fz" | "mx" | "my" | "mz" | null {
  if (value !== null) {
    switch (value.trim()) {
      case "軸力":
        return "fx";
      case "せん断-y":
        return "fy";
      case "せん断-z":
        return "fz";
      case "ねじり":
        return "mx";
      case "曲げ-y":
        return "my";
      case "曲げ-z":
        return "mz";
      default:
        break;
    }
  }
  return null;
}
/**
 * I列のデータ(位置)から着目点(p_id)を抽出する。抽出できない場合はnull
 * @param value I列のデータ(位置)
 * @returns 着目点(p_id)
 */
function extractPositionInfo(value: string | null): "ITAN" | "JTAN" | null {
  if (value !== null) {
    value = value.trim();
    if (value.length > 0) {
      switch (value[0]) {
        case "I":
          return "ITAN";
        case "J":
          return "JTAN";
        default:
          break;
      }
    }
  }
  return null;
}
/**
 * 欠損データを補完する
 * @param data データを格納したMidasData型オブジェクト
 */
function step2(data: MidasData): void {
  // 足りない成分は最初に見つかった成分と同じ値とする
  const keys = ["fx", "fy", "fz", "mx", "my", "mz"];
  for (const data1 of Object.values(data)) {
    for (const data2 of Object.values(data1)) {
      for (const data3 of Object.values(data2)) {
        for (const data4 of Object.values(data3)) {
          const values = Object.values(data4);
          if (values.length < keys.length) {
            if (values.length === 0) {
              throw new Error(); // 内部エラー
            }
            const firstValue = values.reduce((a, b) => (a.seq < b.seq ? a : b));
            for (const missing of keys) {
              if (!(missing in data4)) {
                data4[missing] = firstValue;
              }
            }
          }
        }
      }
    }
  }
  // (最大)または(最小)のデータが存在しないケースの補完はstep4()で実施する
}
/**
 * csv形式で出力しやすいようにデータ構造を変更する
 * @param data データを格納したMidasData型オブジェクト
 * @returns CsvLine型の配列
 */
function step3(data: MidasData): CsvLine[] {
  const dict: {
    [key: string]: CsvLine;
  } = {};

  for (const [pickupNo, data1] of Object.entries(data)) {
    for (const [m_no, data2] of Object.entries(data1)) {
      for (const [p_id, data3] of Object.entries(data2)) {
        for (const [maxmin, data4] of Object.entries(data3)) {
          for (const [mark, data5] of Object.entries(data4)) {
            const key = `${pickupNo}|${m_no}|${p_id}|${mark}`;
            if (key in dict) {
              const value = dict[key];
              switch (maxmin) {
                case "max":
                  if (value.max !== null) {
                    throw new Error(); // 内部エラー
                  }
                  value.max = data5;
                  break;
                case "min":
                  if (value.min !== null) {
                    throw new Error(); // 内部エラー
                  }
                  value.min = data5;
                  break;
                default:
                  throw new Error(); // 内部エラー
              }
            } else {
              let value: CsvLine;
              switch (maxmin) {
                case "max":
                  value = {
                    pickupNo: Number(pickupNo),
                    mark,
                    m_no: Number(m_no),
                    p_id,
                    max: data5,
                    min: null,
                  };
                  break;
                case "min":
                  value = {
                    pickupNo: Number(pickupNo),
                    mark,
                    m_no: Number(m_no),
                    p_id,
                    max: null,
                    min: data5,
                  };
                  break;
                default:
                  throw new Error(); // 内部エラー
              }
              dict[key] = value;
            }
          }
        }
      }
    }
  }
  const array = Object.values(dict);

  // ソート順は優先度の高い方から順に、ビックアップ番号の昇順、着目断面力の種別の昇順、部材番号の昇順、着目点の名称の昇順
  array.sort((a, b) => {
    const pickupNoCompare = a.pickupNo - b.pickupNo;
    if (pickupNoCompare === 0) {
      const markCompare = stringCompare(a.mark, b.mark);
      if (markCompare === 0) {
        const mnoCompare = a.m_no - b.m_no;
        if (mnoCompare === 0) {
          const pidCompare = stringCompare(a.p_id, b.p_id);
          return pidCompare;
        } else {
          return mnoCompare;
        }
      } else {
        return markCompare;
      }
    } else {
      return pickupNoCompare;
    }
  });

  return array;
}
/**
 * 文字列の比較
 * @param s1 文字列1
 * @param s2 文字列2
 * @returns -1=文字列1の方が小さい、0=等しい、1=文字列1の方が大きい
 */
function stringCompare(s1: string, s2: string): -1 | 0 | 1 {
  if (s1 === s2) {
    return 0;
  } else if (s1 < s2) {
    return -1;
  } else {
    return 1;
  }
}
/**
 * csv形式のピックアップデータとして出力する
 * @param array CsvLine型の配列
 * @returns csv形式のピックアップデータ
 */
function step4(array: CsvLine[]): string {
  const sep = ",";
  // let csv = "PickUpNo,着目断面力,部材No,最大CaseNo,最小CaseNo,着目点,着目点距離,最大Fx,最大Fy,最大Fz,最大Mx,最大My,最大Mz,最小Fx,最小Fy,最小Fz,最小Mx,最小My,最小Mz\n";
  let csv = "\n";
  array.forEach((data) => {
    if (data.max === null && data.min === null) {
      throw new Error(); // 内部エラー
    }
    // maxまはたminのデータが存在しない場合は、存在する方で存在しない方を補完する
    if (data.max === null) {
      data.max = data.min;
    } else if (data.min === null) {
      data.min = data.max;
    }

    let line = "";
    line += `${data.pickupNo}`; // PickUpNo
    line += sep;
    line += `${data.mark}`; // 着目断面力
    line += sep;
    line += `${data.m_no}`; // 部材No
    line += sep;
    line += ""; // 最大CaseNo
    line += sep;
    line += ""; // 最小CaseNo
    line += sep;
    line += `${data.p_id}`; // 着目点
    line += sep;
    line += ""; // 着目点距離
    line += sep;
    line += `${data.max.fx}`; // 最大Fx
    line += sep;
    line += `${data.max.fy}`; // 最大Fy
    line += sep;
    line += `${data.max.fz}`; // 最大Fz
    line += sep;
    line += `${data.max.mx}`; // 最大Mx
    line += sep;
    line += `${data.max.my}`; // 最大My
    line += sep;
    line += `${data.max.mz}`; // 最大Mz
    line += sep;
    line += `${data.min.fx}`; // 最小Fx
    line += sep;
    line += `${data.min.fy}`; // 最小Fy
    line += sep;
    line += `${data.min.fz}`; // 最小Fz
    line += sep;
    line += `${data.min.mx}`; // 最小Mx
    line += sep;
    line += `${data.min.my}`; // 最小My
    line += sep;
    line += `${data.min.mz}`; // 最小Mz
    csv += line + "\n";
  });
  return csv;
}
/**
 * 文字列を数値に変換する。変換できない場合はnull
 * @param num 変換対象の文字列
 * @returns 数値またはnull
 */
function toNumber(num: string | null): number | null {
  let result: number = null;
  try {
    if (num === null) return null;
    if (num == null) return null;

    const tmp: string = num.toString().trim();
    if (tmp.length > 0) {
      result = ((n: number) => (isNaN(n) ? null : n))(+tmp);
    }
  } catch {
    result = null;
  }
  return result;
}
