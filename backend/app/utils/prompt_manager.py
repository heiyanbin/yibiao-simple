"""提示词管理模块"""
import yaml
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# 提示词配置文件路径
PROMPTS_FILE = Path(__file__).parent.parent.parent / "prompts.yaml"

# 缓存加载的提示词
_prompts_cache = None


def _load_prompts() -> dict:
    """加载提示词配置文件"""
    global _prompts_cache
    if _prompts_cache is not None:
        return _prompts_cache

    try:
        if PROMPTS_FILE.exists():
            with open(PROMPTS_FILE, 'r', encoding='utf-8') as f:
                _prompts_cache = yaml.safe_load(f)
                logger.info(f"提示词配置加载成功: {PROMPTS_FILE}")
                return _prompts_cache
        else:
            logger.warning(f"提示词配置文件不存在: {PROMPTS_FILE}，使用内置默认值")
            return _get_builtin_defaults()
    except Exception as e:
        logger.error(f"加载提示词配置文件失败: {e}")
        return _get_builtin_defaults()


def _get_builtin_defaults() -> dict:
    """内置默认提示词（配置文件丢失时的备用）"""
    return {
        "document_analysis": {
            "overview": "你是一个专业的标书撰写专家。请分析用户发来的招标文件，提取并总结项目概述信息。",
            "requirements": "你是一名专业的招标文件分析师，擅长从复杂的招标文档中高效提取技术评分项相关内容。"
        },
        "outline_generation": {
            "level1": "你是专业的标书编写专家，擅长根据项目需求编写标书。",
            "level2_3": "你是专业的标书编写专家，擅长根据项目需求编写标书。",
            "chapter_content": "你是一个专业的标书编写专家，负责为投标文件的技术标部分生成具体内容。"
        }
    }


# ============ 文档分析提示词 ============

def get_default_overview_prompt() -> str:
    """获取项目概述提取的默认提示词"""
    prompts = _load_prompts()
    return prompts.get('document_analysis', {}).get('overview', '')


def get_default_requirements_prompt() -> str:
    """获取技术评分要求提取的默认提示词"""
    prompts = _load_prompts()
    return prompts.get('document_analysis', {}).get('requirements', '')


def get_all_default_prompts() -> dict:
    """获取所有默认提示词"""
    prompts = _load_prompts()
    return {
        "document_analysis": prompts.get('document_analysis', {}),
        "outline_generation": {
            "full_outline": prompts.get('outline_generation', {}).get('full_outline', ''),
            "level1": prompts.get('outline_generation', {}).get('level1', ''),
            "level2_3": prompts.get('outline_generation', {}).get('level2_3', ''),
            "chapter_content": prompts.get('outline_generation', {}).get('chapter_content', '')
        }
    }


def reload_prompts():
    """重新加载提示词配置（用于热更新）"""
    global _prompts_cache
    _prompts_cache = None
    return _load_prompts()


# ============ 目录生成提示词 ============

def get_outline_level1_prompt() -> str:
    """获取一级目录生成的提示词"""
    prompts = _load_prompts()
    return prompts.get('outline_generation', {}).get('level1', '')


def get_outline_level2_3_prompt() -> str:
    """获取二三级目录生成的提示词"""
    prompts = _load_prompts()
    return prompts.get('outline_generation', {}).get('level2_3', '')


def get_full_outline_prompt() -> str:
    """获取完整目录生成的提示词（用于 generate-stream API）"""
    prompts = _load_prompts()
    return prompts.get('outline_generation', {}).get('full_outline', '')


def get_chapter_content_prompt() -> str:
    """获取章节内容生成的提示词"""
    prompts = _load_prompts()
    return prompts.get('outline_generation', {}).get('chapter_content', '')


# ============ 大纲生成提示词（保留原有函数兼容性）============

def read_expand_outline_prompt():
    """从简版技术方案中提取目录的提示词"""
    prompts = _load_prompts()
    # 使用配置文件中的提示词或回退到默认
    base_prompt = prompts.get('outline_generation', {}).get('expand_outline', '')

    if base_prompt:
        return base_prompt

    # 兼容旧版本的默认提示词
    return """你是一个专业的标书编写专家。需要从用户提交的标书技术方案中，提取出目录结构。

要求：
1. 目录结构要全面覆盖技术标的所有必要目录，包含多级目录
2. 如果技术方案中有章节名称，则直接使用技术方案中的章节名称
3. 如果技术方案中没有章节名称，则结合全文，总结出章节名称
5. 返回标准JSON格式，包含章节编号、标题、描述和子章节，注意编号要连贯
6. 除了JSON结果外，不要输出任何其他内容

JSON格式要求：
{
  "outline": [
    {
      "id": "1",
      "title": "",
      "description": "",
      "children": [
        {
          "id": "1.1",
          "title": "",
          "description": "",
          "children":[
              {
                "id": "1.1.1",
                "title": "",
                "description": ""
              }
          ]
        }
      ]
    }
  ]
}
"""


def generate_outline_prompt(overview, requirements, custom_prompt=None):
    """生成目录结构的提示词"""
    # 使用自定义提示词或默认提示词
    if custom_prompt:
        full_prompt = custom_prompt
    else:
        full_prompt = get_full_outline_prompt()

    # 如果配置文件中有提示词，使用配置的
    if full_prompt:
        system_prompt = full_prompt + """

JSON格式要求：
{
  "outline": [
    {
      "id": "1",
      "title": "",
      "description": "",
      "children": [
        {
          "id": "1.1",
          "title": "",
          "description": "",
          "children": [
            {
              "id": "1.1.1",
              "title": "",
              "description": "",
              "children": [
                {
                  "id": "1.1.1.1",
                  "title": "",
                  "description": ""
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
"""
    else:
        # 兼容旧版本
        system_prompt = """你是一个专业的标书编写专家。根据提供的项目概述和技术评分要求，生成投标文件中技术标部分的目录结构。

要求：
1. 目录结构要全面覆盖技术标的所有必要章节
2. 章节名称要专业、准确，符合投标文件规范
3. 一级目录名称要与技术评分要求中的章节名称一致，如果技术评分要求中没有章节名称，则结合技术评分要求中的内容，生成一级目录名称
4. 目录层级一般为三级，但对于重点章节或内容较多的章节，可以扩展到四级
5. 返回标准JSON格式，包含章节编号、标题、描述和子章节
6. 除了JSON结果外，不要输出任何其他内容

JSON格式要求：
{
  "outline": [
    {
      "id": "1",
      "title": "",
      "description": "",
      "children": [
        {
          "id": "1.1",
          "title": "",
          "description": "",
          "children": [
            {
              "id": "1.1.1",
              "title": "",
              "description": "",
              "children": [
                {
                  "id": "1.1.1.1",
                  "title": "",
                  "description": ""
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
"""

    user_prompt = f"""请基于以下项目信息生成标书目录结构：

项目概述：
{overview}

技术评分要求：
{requirements}

请生成完整的技术标目录结构，确保覆盖所有技术评分要点。"""
    return system_prompt, user_prompt


def generate_outline_with_old_prompt(overview, requirements, old_outline, custom_prompt=None):
    """结合旧目录生成新目录的提示词"""
    system_prompt, _ = generate_outline_prompt(overview, requirements, custom_prompt)

    # 修改为包含旧目录的版本
    system_prompt_with_old = system_prompt.replace(
        "你是一个专业的标书编写专家。根据提供的项目概述和技术评分要求",
        "你是一个专业的标书编写专家。根据提供的项目概述和技术评分要求，生成投标文件中技术标部分的目录结构。\n  用户会提供一个自己编写的目录，你要保证目录满足技术评分要求，并充分结合用户自己编写的目录。"
    )

    user_prompt = f"""请基于以下项目信息生成标书目录结构：
用户自己编写的目录：
{old_outline}

项目概述：
{overview}

技术评分要求：
{requirements}

请生成完整的技术标目录结构，确保覆盖所有技术评分要点。"""
    return system_prompt_with_old, user_prompt