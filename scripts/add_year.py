import json
import os

BASE_DIR = r"d:\code\jscode\slowlyRecord\slowlyRecord\public\datafile\poetry"

YEAR_MAP = {
    # 先秦
    "xq_001": -600,
    "xq_002": -600,
    "xq_003": -278,
    "xq_004": -278,
    "xq_005": -600,
    "xq_006": -600,
    "xq_007": -600,
    "xq_008": -600,
    "xq_009": -475,
    "xq_010": -684,
    "xq_011": -289,
    "xq_012": -278,

    # 两汉
    "han_001": 208,
    "han_002": 207,
    "han_003": 500,
    "han_004": 150,
    "han_005": 80,
    "han_006": 80,
    "han_007": 150,
    "han_008": 150,
    "han_009": 207,
    "han_010": 80,
    "han_011": 200,
    "han_012": 227,
    "han_013": 80,
    "han_014": 150,
    "han_015": 80,
    "han_016": -200,
    "han_017": -99,
    "han_018": -99,
    "han_019": 223,
    "han_020": 207,
    "han_021": 80,

    # 魏晋南北朝
    "wj_001": 405,
    "wj_002": 417,
    "wj_003": 550,
    "wj_004": 240,
    "wj_005": 223,
    "wj_006": 207,
    "wj_007": 208,
    "wj_008": 207,
    "wj_009": 421,
    "wj_010": 353,
    "wj_011": 520,
    "wj_012": 520,
    "wj_013": 500,
    "wj_014": 420,
    "wj_015": 420,

    # 隋
    "sui_001": 600,
    "sui_002": 580,
    "sui_003": 600,
    "sui_004": 580,
    "sui_005": 600,
    "sui_006": 600,
    "sui_007": 600,
    "sui_008": 580,
    "sui_009": 580,

    # 宋
    "song_001": 1076,
    "song_002": 1082,
    "song_003": 1130,
    "song_004": 1100,
    "song_005": 1134,
    "song_006": 1030,
    "song_007": 1046,
    "song_008": 1082,
    "song_009": 1167,
    "song_010": 1205,
    "song_011": 1188,
    "song_012": 1279,
    "song_013": 1046,
    "song_014": 1075,
    "song_015": 1082,
    "song_016": 1080,
    "song_017": 1100,
    "song_018": 1076,
    "song_019": 1075,
    "song_020": 1103,
    "song_021": 1186,
    "song_022": 1186,
    "song_023": 1205,
    "song_024": 1176,
    "song_025": 1174,
    "song_026": 1176,
    "song_027": 1166,
    "song_028": 1240,
    "song_029": 1070,
    "song_030": 1083,
    "song_031": 1070,
    "song_032": 1160,
    "song_033": 1126,
    "song_034": 1200,
    "song_035": 1200,
    "song_036": 1040,
    "song_037": 1075,
    "song_038": 1084,
    "song_039": 1085,
    "song_040": 1073,
    "song_041": 1210,
    "song_042": 1192,
    "song_043": 1160,
    "song_044": 1160,
    "song_045": 1040,
    "song_046": 1100,
    "song_047": 1135,
    "song_048": 1130,
    "song_049": 1190,
    "song_050": 1020,
    "song_051": 1040,
    "song_052": 1060,
    "song_053": 1050,

    # 元
    "yuan_001": 1290,
    "yuan_002": 1329,
    "yuan_003": 1290,
    "yuan_004": 1290,
    "yuan_005": 1300,
    "yuan_006": 1329,
    "yuan_007": 1260,
    "yuan_008": 1290,
    "yuan_009": 1290,
    "yuan_010": 1290,

    # 明
    "ming_001": 1440,
    "ming_002": 1524,
    "ming_003": 1500,
    "ming_004": 1500,
    "ming_005": 1370,
    "ming_006": 1540,
    "ming_007": 1520,
    "ming_008": 1620,
    "ming_009": 1647,
    "ming_010": 1506,
    "ming_011": 1640,
    "ming_012": 1370,

    # 清
    "qing_001": 1839,
    "qing_002": 1680,
    "qing_003": 1780,
    "qing_004": 1750,
    "qing_005": 1860,
    "qing_006": 1750,
    "qing_007": 1775,
    "qing_008": 1839,
    "qing_009": 1900,
    "qing_010": 1839,
    "qing_011": 1880,
    "qing_012": 1898,
    "qing_013": 1780,
    "qing_014": 1780,
    "qing_015": 1680,

    # 现代
    "xiandai_001": 1928,
    "xiandai_002": 1927,
    "xiandai_003": 1989,
    "xiandai_004": 1972,
    "xiandai_005": 1938,
}


def process_file(filename):
    path = os.path.join(BASE_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    modified = False
    for poem in data.get("poems", []):
        pid = poem.get("id")
        if pid in YEAR_MAP:
            poem["year"] = YEAR_MAP[pid]
            modified = True

    if modified:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Updated: {filename}")
    else:
        print(f"No changes: {filename}")


if __name__ == "__main__":
    files = [f for f in os.listdir(BASE_DIR) if f.endswith(".json") and f != "index.json"]
    for f in files:
        process_file(f)
