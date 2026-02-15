/**
 * Evaluation and topic generation prompts
 */

import { LLM_MODEL, LLM_TOKEN_LIMITS } from "../../config/constants";
import type { Bindings } from "../../types/bindings";
import type { JudgeVerdict, NextTopic, Session, Statement } from "../../types/database";
import { callLLM } from "../llm";

/**
 * Generate AI judge verdict
 */
export async function generateJudgeVerdict(
	env: Bindings,
	session: Session & { topic_title: string; topic_description: string },
	allStatements: Array<Statement & { agent_name: string; turn_number: number }>,
): Promise<JudgeVerdict> {
	const systemPrompt = `あなたは議論の良し悪しを判断する厳格な審判です。甘い採点は議論の改善を妨げるため、問題点を積極的に見つけてください。

## 採点基準（全軸共通・1-10点）
1-2: 著しく不足。該当する要素がほぼ見られない
3-4: 不十分。断片的にはあるが全体として弱い
5-6: 平均的。基本はできているが深みや際立つ点に欠ける
7-8: 優良。明確な強みがあり問題点が少ない
9-10: 卓越。極めて稀な水準

大半の議論は3-6点に収まります。7点以上には具体的根拠が必要です。`;

	const formatAllStatements = (
		statements: Array<Statement & { agent_name: string; turn_number: number }>,
	): string => {
		const grouped: Record<
			number,
			Array<Statement & { agent_name: string; turn_number: number }>
		> = {};
		for (const stmt of statements) {
			if (!grouped[stmt.turn_number]) {
				grouped[stmt.turn_number] = [];
			}
			grouped[stmt.turn_number].push(stmt);
		}

		return Object.entries(grouped)
			.map(([turn, stmts]) => {
				const turnStatements = stmts.map((s) => `  - ${s.agent_name}: ${s.content}`).join("\n");
				return `**ターン ${turn}**\n${turnStatements}`;
			})
			.join("\n\n");
	};

	const userPrompt = `## トピック
${session.topic_title}
${session.topic_description}

## 議論全体
${formatAllStatements(allStatements)}

## 評価軸
1. quality: 論理性、根拠の明確さ、議論の深さ
2. cooperation: 建設的対話、相互理解
3. convergence: 合意形成の明確さ
4. novelty: 独自の視点、通説からの脱却
5. inclusiveness: 多様な立場への配慮、少数意見の尊重
6. transformation: 議論を通じた意見の変化・発展
7. cross_reference: 他者の発言への言及、対話の連続性

## 回答手順
まず各軸について問題点・不足点を必ず1つ以上指摘し、それを踏まえて採点してください。
問題点が見つからない軸のみ7点以上を付けてください。

以下のJSON形式で出力してください：
{
  "quality_score": number, "quality_issue": "問題点を1文で",
  "cooperation_score": number, "cooperation_issue": "問題点を1文で",
  "convergence_score": number, "convergence_issue": "問題点を1文で",
  "novelty_score": number, "novelty_issue": "問題点を1文で",
  "inclusiveness_score": number, "inclusiveness_issue": "問題点を1文で",
  "transformation_score": number, "transformation_issue": "問題点を1文で",
  "cross_reference_score": number, "cross_reference_issue": "問題点を1文で",
  "summary": "総合評価を2-3文で",
  "highlights": ["注目すべき発言1", "注目すべき発言2"],
  "consensus": "到達したコンセンサス（あれば）"
}

JSONのみを出力してください。`;

	try {
		const response = await callLLM(env, {
			model: LLM_MODEL,
			maxTokens: LLM_TOKEN_LIMITS.JUDGE_VERDICT,
			system: systemPrompt,
			messages: [{ role: "user", content: userPrompt }],
		});

		// Parse JSON from response
		const jsonMatch = response.content.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error("Failed to extract JSON from response");
		}

		const verdict = JSON.parse(jsonMatch[0]) as JudgeVerdict;

		// Validate verdict structure
		if (
			typeof verdict.quality_score !== "number" ||
			typeof verdict.cooperation_score !== "number" ||
			typeof verdict.convergence_score !== "number" ||
			typeof verdict.novelty_score !== "number" ||
			typeof verdict.inclusiveness_score !== "number" ||
			typeof verdict.transformation_score !== "number" ||
			typeof verdict.cross_reference_score !== "number"
		) {
			throw new Error("Invalid verdict structure");
		}

		return verdict;
	} catch (error) {
		console.error("Failed to generate judge verdict:", error);
		// Return default verdict
		return {
			quality_score: 5,
			cooperation_score: 5,
			convergence_score: 5,
			novelty_score: 5,
			inclusiveness_score: 5,
			transformation_score: 5,
			cross_reference_score: 5,
			summary: "（評価の生成に失敗しました）",
			highlights: [],
			consensus: "（評価できませんでした）",
		};
	}
}

/**
 * Generate next topic based on session results
 * Returns a single topic suggestion for continuing the deliberation
 */
export async function generateNextTopic(
	env: Bindings,
	session: { topic_title: string; topic_description: string },
	sessionSummary: string,
	judgeVerdict: JudgeVerdict,
): Promise<NextTopic | null> {
	const systemPrompt = "あなたは熟議の論点を分析し、次に議論すべきテーマを提案する専門家です。";

	const userPrompt = `## 今回のトピック
${session.topic_title}: ${session.topic_description}

## セッションのサマリー
${sessionSummary}

## 審判の評価
- 評価サマリー: ${judgeVerdict.summary}
- コンセンサス: ${judgeVerdict.consensus}

## 指示
この議論を踏まえて、次に議論すべき論点を1つ提案してください。
この議論に参加していない人々だけでも議論が進められるように、文脈に依存しないかつ、具体的なタイトルと説明を含めてください。
議論には専門家のみならず、一般市民含めさまざまな背景を持つ人が参加します、なるべく平易な表現を用いてください。

- 今回の議論で合意できなかったが、溝が埋まる可能性のある論点
- 合意の次のステップとして議論すべき論点
- 新たに浮上した論点
のいずれかの観点から、最も重要な論点を選んでください。

### 例

{ "title": "オンライン広告詐欺対策: プラットフォーマーの責任", "description": "日本では現在オンライン広告詐欺が蔓延しています。この問題に大規模広告プラットフォームはどんなことが出来るでしょう？すべての広告主に対して出稿前に実在性確認（KYA）を義務付けるべき？広告プラットフォームは、詐欺広告から収益を得ている以上、当該詐欺に対して一定の法的責任を負うべき？プラットフォームが「詐欺だ」と知ってから一定時間（例24時間）以内に削除しない場合は、政府は高額の罰金あるいは罰則を課すべき？" }
{ "title": "地方創生は本当に必要か？", "description": "これまでの地方創生は「地方を元気に」というスローガンのもと、補助金と箱モノに偏りがちだった。そもそも人口が増えない前提の社会で、何をもって地方創生が「必要」と言えるのか、その目的と評価軸から問い直す。" }
{ "title": "毒親家庭と教師: 家庭環境に合わせた教育と教師の負担について", "description": "教師が抱える対応には限界があるなかで、どのような対策が求められるか？本人が家庭環境を普通だと思っている場合が多く、問題が表面化しにくい。指導や会話が長引き業務負担が極めて重くなる。子どもの発達に大きく影響し学校の指導だけで解決しないこともある。" }

JSON形式で出力してください（他の説明は不要です）：
{ "title": "30文字以内のタイトル", "description": "120文字以内の説明" }`;

	try {
		const response = await callLLM(env, {
			model: LLM_MODEL,
			maxTokens: LLM_TOKEN_LIMITS.NEXT_TOPICS,
			system: systemPrompt,
			messages: [{ role: "user", content: userPrompt }],
		});

		const jsonMatch = response.content.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error("Failed to extract JSON from response");
		}

		const topic = JSON.parse(jsonMatch[0]) as NextTopic;

		if (!topic.title || !topic.description) {
			throw new Error("Invalid topic structure: missing title or description");
		}

		return {
			title: topic.title,
			description: topic.description,
		};
	} catch (error) {
		console.error("Failed to generate next topic:", error);
		return null;
	}
}
