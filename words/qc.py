import json
import re
import os

# 获取脚本所在目录，确保文件路径正确
script_dir = os.path.dirname(os.path.abspath(__file__))

def clean_json_content(content):
    """
    清理 JSON 内容中的多余空行、注释和尾随逗号问题
    """
    # 1. 移除单行注释
    content = re.sub(r'//.*$', '', content, flags=re.MULTILINE)

    # 2. 移除多行注释
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)

    # 3. 处理每行：移除空行，修复尾随逗号
    lines = content.split('\n')
    cleaned_lines = []
    for line in lines:
        stripped = line.strip()
        # 跳过纯空行
        if stripped == '':
            continue
        cleaned_lines.append(line)

    # 4. 修复对象和数组中的尾随逗号（逗号后跟 } 或 ]）
    result = '\n'.join(cleaned_lines)
    result = re.sub(r',(\s*[}\]])', r'\1', result)

    return result

def parse_json_with_duplicate_keys(content):
    """
    解析 JSON，保留重复 key 的所有值
    返回 (data_dict, duplicate_keys_info)
    """
    # 使用自定义 hook 来检测重复 key
    duplicate_keys = []

    def dict_hook(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                duplicate_keys.append(key)
                # 保留第一个出现的值（或者可以改为保留最后一个）
                # 这里我们保留第一个，跳过重复的
                continue
            result[key] = value
        return result

    data = json.loads(content, object_pairs_hook=dict_hook)
    return data, duplicate_keys

def remove_duplicates_by_word(data):
    """
    根据 word 字段去重
    保留第一次出现的单词，后面的重复项删除
    """
    seen_words = set()
    unique_data = {}
    duplicates = []

    for key, value in data.items():
        word = value.get('word', '').lower()  # 转小写确保 "Afternoon" 和 "afternoon" 算重复

        if word not in seen_words:
            seen_words.add(word)
            unique_data[key] = value  # 保留原始key
        else:
            duplicates.append((key, word))

    return unique_data, duplicates

# ========== 主程序 ==========

input_file = os.path.join(script_dir, 'e.json')      # ← 你的输入文件名
output_file = os.path.join(script_dir, 'e.json')     # ← 输出去重后的文件名

try:
    # 1. 读取原始内容
    with open(input_file, 'r', encoding='utf-8') as f:
        raw_content = f.read()

    # 2. 清理 JSON 内容（处理多余空行）
    cleaned_content = clean_json_content(raw_content)

    # 3. 解析 JSON（检测重复 key）
    data, duplicate_keys = parse_json_with_duplicate_keys(cleaned_content)

    if duplicate_keys:
        print(f"警告: 发现 {len(duplicate_keys)} 个重复 key: {set(duplicate_keys)}")
        print("        已自动跳过重复 key 的条目（保留第一个）")
        print()

    print(f"原始条目数: {len(data)}")

    # 4. 去重
    unique_data, duplicates = remove_duplicates_by_word(data)

    # 5. 显示重复项详情
    if duplicates:
        print(f"\n发现 {len(duplicates)} 个重复单词:")
        for key, word in duplicates:
            print(f"  - {word} (key: {key})")
    else:
        print("\n未发现重复单词")

    print(f"\n去重后条目数: {len(unique_data)}")
    print(f"删除重复: {len(data) - len(unique_data)} 个")

    # 6. 保存
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(unique_data, f, ensure_ascii=False, indent=2)

    print(f"[OK] 已保存到: {output_file}")

except FileNotFoundError:
    print(f"[错误] 找不到文件: {input_file}")
except json.JSONDecodeError as e:
    print(f"[错误] JSON格式错误: {e}")
    print("       请检查文件内容是否有效")
except Exception as e:
    print(f"[错误] {e}")
