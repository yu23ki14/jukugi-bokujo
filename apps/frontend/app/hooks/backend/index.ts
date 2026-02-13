// @ts-nocheck

import {
  useMutation,
  useQuery
} from '@tanstack/react-query';
import type {
  DataTag,
  DefinedInitialDataOptions,
  DefinedUseQueryResult,
  MutationFunction,
  QueryClient,
  QueryFunction,
  QueryKey,
  UndefinedInitialDataOptions,
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult
} from '@tanstack/react-query';

import { customBackendClient } from '../../lib/orval-custom';
import type { ErrorType } from '../../lib/orval-custom';
/**
 * Topic status (active | archived)
 */
export type TopicSummaryStatus = typeof TopicSummaryStatus[keyof typeof TopicSummaryStatus];


export const TopicSummaryStatus = {
  active: 'active',
  archived: 'archived',
} as const;

export interface TopicSummary {
  /** Topic ID */
  id: string;
  /** Topic title */
  title: string;
  /** Topic description */
  description: string;
  /** Topic status (active | archived) */
  status: TopicSummaryStatus;
  /** Unix timestamp (seconds) when created */
  created_at: number;
}

export interface ListTopicsResponse {
  /** List of active topics */
  topics: TopicSummary[];
}

export interface ErrorResponse {
  /** Error message */
  error: string;
  /** Error code */
  code?: string;
  /** Additional error details */
  details?: unknown | null;
}

/**
 * Topic status (active | archived)
 */
export type GetTopicResponseStatus = typeof GetTopicResponseStatus[keyof typeof GetTopicResponseStatus];


export const GetTopicResponseStatus = {
  active: 'active',
  archived: 'archived',
} as const;

export interface GetTopicResponse {
  /** Topic ID */
  id: string;
  /** Topic title */
  title: string;
  /** Topic description */
  description: string;
  /** Topic status (active | archived) */
  status: GetTopicResponseStatus;
  /** Unix timestamp (seconds) when created */
  created_at: number;
  /** Unix timestamp (seconds) when last updated */
  updated_at: number;
}

export interface CreateTopicRequest {
  /**
   * Topic title
   * @minLength 1
   * @maxLength 200
   */
  title: string;
  /**
   * Topic description
   * @minLength 1
   * @maxLength 2000
   */
  description: string;
}

export interface AgentPersona {
  /** Agent's core values */
  core_values: string[];
  /** Agent's thinking and communication style */
  thinking_style: string;
  /** Agent's personality traits */
  personality_traits: string[];
  /** Agent's background and context */
  background: string;
  /** Persona version number */
  version: number;
}

/**
 * Agent status (active | reserve)
 */
export type AgentStatusType = typeof AgentStatusType[keyof typeof AgentStatusType];

export const AgentStatusType = {
  active: 'active',
  reserve: 'reserve',
} as const;

export interface CreateAgentResponse {
  /** Agent ID */
  id: string;
  /** Owner user ID */
  user_id: string;
  /** Agent name */
  name: string;
  persona: AgentPersona;
  /** Agent status (active = participates in deliberations, reserve = training only) */
  status: AgentStatusType;
  /** Unix timestamp (seconds) when created */
  created_at: number;
}

export interface CreateAgentRequest {
  /**
   * Agent name
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  /** User-selected core values (exactly 3) */
  values: string[];
}

export interface AgentSummary {
  /** Agent ID */
  id: string;
  /** Agent name */
  name: string;
  persona: AgentPersona;
  /** Agent status (active = participates in deliberations, reserve = training only) */
  status: AgentStatusType;
  /** Number of active sessions this agent is currently participating in */
  active_session_count: number;
  /** Unix timestamp (seconds) when created */
  created_at: number;
}

export interface ListAgentsResponse {
  /** List of user's agents */
  agents: AgentSummary[];
}

export interface GetAgentResponse {
  /** Agent ID */
  id: string;
  /** Owner user ID */
  user_id: string;
  /** Agent name */
  name: string;
  persona: AgentPersona;
  /** Agent status (active = participates in deliberations, reserve = training only) */
  status: AgentStatusType;
  /** Unix timestamp (seconds) when created */
  created_at: number;
  /** Unix timestamp (seconds) when last updated */
  updated_at: number;
}

export interface UpdateAgentResponse {
  /** Agent ID */
  id: string;
  /** Owner user ID */
  user_id: string;
  /** Agent name */
  name: string;
  persona: AgentPersona;
  /** Unix timestamp (seconds) when last updated */
  updated_at: number;
}

export interface UpdateAgentRequest {
  /**
   * New agent name
   * @minLength 1
   * @maxLength 100
   */
  name?: string;
}

export interface SuccessResponse {
  success: boolean;
  message: string;
}

export interface CreateKnowledgeResponse {
  /** Knowledge entry ID */
  id: string;
  /** Agent ID this knowledge belongs to */
  agent_id: string;
  /** Knowledge entry title */
  title: string;
  /** Knowledge entry content */
  content: string;
  /** Unix timestamp (seconds) when created */
  created_at: number;
}

export interface CreateKnowledgeRequest {
  /**
   * Knowledge entry title (max 30 characters)
   * @minLength 1
   * @maxLength 30
   */
  title: string;
  /**
   * Knowledge entry content (max 500 characters)
   * @minLength 1
   * @maxLength 500
   */
  content: string;
}

export interface KnowledgeEntry {
  /** Knowledge entry ID */
  id: string;
  /** Knowledge entry title */
  title: string;
  /** Knowledge entry content */
  content: string;
  /** Unix timestamp (seconds) when created */
  created_at: number;
}

export interface ListKnowledgeResponse {
  /** List of knowledge entries for the agent */
  knowledge: KnowledgeEntry[];
}

export interface CreateDirectionResponse {
  /** Direction ID */
  id: string;
  /** Agent ID */
  agent_id: string;
  /** Session ID */
  session_id: string;
  /** Turn number */
  turn_number: number;
  /** Direction content */
  content: string;
  /** Unix timestamp (seconds) when created */
  created_at: number;
}

export interface CreateDirectionRequest {
  /** Session ID to provide direction for */
  session_id: string;
  /**
   * Turn number to apply this direction to
   * @minimum 1
   */
  turn_number: number;
  /**
   * Direction content (max 80 characters)
   * @minLength 1
   * @maxLength 80
   */
  content: string;
}

export interface Direction {
  id: string;
  session_id: string;
  turn_number: number;
  content: string;
  created_at: number;
}

export interface ListDirectionsResponse {
  /** List of directions for the agent */
  directions: Direction[];
}

export interface CreateFeedbackResponse {
  /** Feedback ID */
  id: string;
  /** Agent ID */
  agent_id: string;
  /** Session ID */
  session_id: string;
  /** Feedback content */
  content: string;
  /** Unix timestamp (seconds) when created */
  created_at: number;
}

export interface CreateFeedbackRequest {
  /** Session ID to provide feedback for */
  session_id: string;
  /**
   * Feedback content (max 400 characters)
   * @minLength 1
   * @maxLength 400
   */
  content: string;
}

export interface Feedback {
  id: string;
  session_id: string;
  content: string;
  /** @nullable */
  applied_at: number | null;
  created_at: number;
}

export interface UpdateFeedbackRequest {
  /**
   * Updated feedback content (max 400 characters)
   * @minLength 1
   * @maxLength 400
   */
  content: string;
}

export interface ListFeedbacksResponse {
  /** List of feedbacks for the agent */
  feedbacks: Feedback[];
}

export interface SessionStrategyResponse {
  id: string;
  agent_id: string;
  session_id: string;
  strategy: string;
  created_at: number;
}

export interface ListSessionStrategiesResponse {
  /** List of session strategies for the agent */
  strategies: SessionStrategyResponse[];
}

/**
 * Session status (pending | active | completed | cancelled)
 */
export type SessionSummaryStatus = typeof SessionSummaryStatus[keyof typeof SessionSummaryStatus];


export const SessionSummaryStatus = {
  pending: 'pending',
  active: 'active',
  completed: 'completed',
  cancelled: 'cancelled',
} as const;

/**
 * Topic information
 */
export type SessionSummaryTopic = {
  /** Topic ID */
  id: string;
  /** Topic title */
  title: string;
};

export interface SessionSummary {
  /** Session ID */
  id: string;
  /** Topic information */
  topic: SessionSummaryTopic;
  /** Session status (pending | active | completed | cancelled) */
  status: SessionSummaryStatus;
  /** Current turn number */
  current_turn: number;
  /** Maximum number of turns */
  max_turns: number;
  /** Number of participants */
  participant_count: number;
  /**
   * Unix timestamp (seconds) when started
   * @nullable
   */
  started_at: number | null;
  /**
   * Unix timestamp (seconds) when completed
   * @nullable
   */
  completed_at: number | null;
}

export interface ListSessionsResponse {
  /** List of sessions */
  sessions: SessionSummary[];
  /** Total number of sessions matching the query */
  total: number;
}

/**
 * Topic information
 */
export type GetSessionResponseTopic = {
  /** Topic ID */
  id: string;
  /** Topic title */
  title: string;
  /** Topic description */
  description: string;
};

/**
 * Session status (pending | active | completed | cancelled)
 */
export type GetSessionResponseStatus = typeof GetSessionResponseStatus[keyof typeof GetSessionResponseStatus];


export const GetSessionResponseStatus = {
  pending: 'pending',
  active: 'active',
  completed: 'completed',
  cancelled: 'cancelled',
} as const;

export interface SessionParticipant {
  /** Agent ID */
  agent_id: string;
  /** Agent name */
  agent_name: string;
  /** Owner user ID */
  user_id: string;
}

/**
 * Judge's verdict (available when completed)
 * @nullable
 */
export type JudgeVerdict = {
  /**
   * Quality score of the deliberation (1-10)
   * @minimum 1
   * @maximum 10
   */
  quality_score: number;
  /**
   * Cooperation score among participants (1-10)
   * @minimum 1
   * @maximum 10
   */
  cooperation_score: number;
  /**
   * Convergence score towards consensus (1-10)
   * @minimum 1
   * @maximum 10
   */
  convergence_score: number;
  /**
   * Novelty score of perspectives presented (1-10)
   * @minimum 1
   * @maximum 10
   */
  novelty_score: number;
  /** Summary of the deliberation evaluation */
  summary: string;
  /** Notable statements or highlights from the deliberation */
  highlights: string[];
  /** Consensus reached during the deliberation (if any) */
  consensus: string;
} | null;

export interface GetSessionResponse {
  /** Session ID */
  id: string;
  /** Topic information */
  topic: GetSessionResponseTopic;
  /** Session status (pending | active | completed | cancelled) */
  status: GetSessionResponseStatus;
  /** Current turn number */
  current_turn: number;
  /** Maximum number of turns */
  max_turns: number;
  /** Session participants */
  participants: SessionParticipant[];
  /**
   * Session summary (available when completed)
   * @nullable
   */
  summary: string | null;
  judge_verdict: JudgeVerdict | null;
  /**
   * Unix timestamp (seconds) when started
   * @nullable
   */
  started_at: number | null;
  /**
   * Unix timestamp (seconds) when completed
   * @nullable
   */
  completed_at: number | null;
}

/**
 * Turn status (pending | processing | completed | failed)
 */
export type TurnStatus = typeof TurnStatus[keyof typeof TurnStatus];


export const TurnStatus = {
  pending: 'pending',
  processing: 'processing',
  completed: 'completed',
  failed: 'failed',
} as const;

export interface Statement {
  /** Statement ID */
  id: string;
  /** Agent ID who made the statement */
  agent_id: string;
  /** Agent name */
  agent_name: string;
  /** Statement content */
  content: string;
  /** Unix timestamp (seconds) when created */
  created_at: number;
}

export interface Turn {
  /** Turn ID */
  id: string;
  /** Turn number */
  turn_number: number;
  /** Turn status (pending | processing | completed | failed) */
  status: TurnStatus;
  /** Statements made during this turn */
  statements: Statement[];
  /**
   * Unix timestamp (seconds) when completed
   * @nullable
   */
  completed_at: number | null;
}

export interface GetSessionTurnsResponse {
  /** List of turns in the session */
  turns: Turn[];
}

export type GetApiAgentsAgentIdDirectionsParams = {
/**
 * Filter by session ID
 */
session_id?: string;
};

export type GetApiAgentsAgentIdFeedbacksParams = {
/**
 * Filter by session ID
 */
session_id?: string;
};

export type GetApiAgentsAgentIdStrategiesParams = {
/**
 * Filter by session ID
 */
session_id?: string;
};

export type GetApiSessionsParams = {
/**
 * Filter by session status
 */
status?: GetApiSessionsStatus;
/**
 * Filter sessions where this user's agents participated
 */
user_id?: string;
/**
 * Maximum number of results
 * @minimum 1
 * @maximum 100
 */
limit?: number;
/**
 * Offset for pagination
 * @minimum 0
 * @nullable
 */
offset?: number | null;
};

export type GetApiSessionsStatus = typeof GetApiSessionsStatus[keyof typeof GetApiSessionsStatus];


export const GetApiSessionsStatus = {
  active: 'active',
  completed: 'completed',
} as const;

type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];



/**
 * Get a list of all active deliberation topics (public endpoint)
 * @summary List active topics
 */
export type getApiTopicsResponse200 = {
  data: ListTopicsResponse
  status: 200
}

export type getApiTopicsResponse500 = {
  data: ErrorResponse
  status: 500
}
    
export type getApiTopicsResponseSuccess = (getApiTopicsResponse200) & {
  headers: Headers;
};
export type getApiTopicsResponseError = (getApiTopicsResponse500) & {
  headers: Headers;
};

export type getApiTopicsResponse = (getApiTopicsResponseSuccess | getApiTopicsResponseError)

export const getGetApiTopicsUrl = () => {


  

  return `/api/topics`
}

export const getApiTopics = async ( options?: RequestInit): Promise<getApiTopicsResponse> => {
  
  return customBackendClient<getApiTopicsResponse>(getGetApiTopicsUrl(),
  {      
    ...options,
    method: 'GET'
    
    
  }
);}





export const getGetApiTopicsQueryKey = () => {
    return [
    `/api/topics`
    ] as const;
    }

    
export const getGetApiTopicsQueryOptions = <TData = Awaited<ReturnType<typeof getApiTopics>>, TError = ErrorType<ErrorResponse>>( options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiTopics>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetApiTopicsQueryKey();

  

    const queryFn: QueryFunction<Awaited<ReturnType<typeof getApiTopics>>> = ({ signal }) => getApiTopics({ signal, ...requestOptions });

      

      

   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getApiTopics>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type GetApiTopicsQueryResult = NonNullable<Awaited<ReturnType<typeof getApiTopics>>>
export type GetApiTopicsQueryError = ErrorType<ErrorResponse>


export function useGetApiTopics<TData = Awaited<ReturnType<typeof getApiTopics>>, TError = ErrorType<ErrorResponse>>(
  options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiTopics>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof getApiTopics>>,
          TError,
          Awaited<ReturnType<typeof getApiTopics>>
        > , 'initialData'
      >, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useGetApiTopics<TData = Awaited<ReturnType<typeof getApiTopics>>, TError = ErrorType<ErrorResponse>>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiTopics>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof getApiTopics>>,
          TError,
          Awaited<ReturnType<typeof getApiTopics>>
        > , 'initialData'
      >, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useGetApiTopics<TData = Awaited<ReturnType<typeof getApiTopics>>, TError = ErrorType<ErrorResponse>>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiTopics>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
/**
 * @summary List active topics
 */

export function useGetApiTopics<TData = Awaited<ReturnType<typeof getApiTopics>>, TError = ErrorType<ErrorResponse>>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiTopics>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient 
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getGetApiTopicsQueryOptions(options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return { ...query, queryKey: queryOptions.queryKey };
}





/**
 * Get detailed information about a specific topic (public endpoint)
 * @summary Get topic details
 */
export type getApiTopicsIdResponse200 = {
  data: GetTopicResponse
  status: 200
}

export type getApiTopicsIdResponse404 = {
  data: ErrorResponse
  status: 404
}

export type getApiTopicsIdResponse500 = {
  data: ErrorResponse
  status: 500
}
    
export type getApiTopicsIdResponseSuccess = (getApiTopicsIdResponse200) & {
  headers: Headers;
};
export type getApiTopicsIdResponseError = (getApiTopicsIdResponse404 | getApiTopicsIdResponse500) & {
  headers: Headers;
};

export type getApiTopicsIdResponse = (getApiTopicsIdResponseSuccess | getApiTopicsIdResponseError)

export const getGetApiTopicsIdUrl = (id: string,) => {


  

  return `/api/topics/${id}`
}

export const getApiTopicsId = async (id: string, options?: RequestInit): Promise<getApiTopicsIdResponse> => {
  
  return customBackendClient<getApiTopicsIdResponse>(getGetApiTopicsIdUrl(id),
  {      
    ...options,
    method: 'GET'
    
    
  }
);}





export const getGetApiTopicsIdQueryKey = (id: string,) => {
    return [
    `/api/topics/${id}`
    ] as const;
    }

    
export const getGetApiTopicsIdQueryOptions = <TData = Awaited<ReturnType<typeof getApiTopicsId>>, TError = ErrorType<ErrorResponse>>(id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiTopicsId>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetApiTopicsIdQueryKey(id);

  

    const queryFn: QueryFunction<Awaited<ReturnType<typeof getApiTopicsId>>> = ({ signal }) => getApiTopicsId(id, { signal, ...requestOptions });

      

      

   return  { queryKey, queryFn, enabled: !!(id), ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getApiTopicsId>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type GetApiTopicsIdQueryResult = NonNullable<Awaited<ReturnType<typeof getApiTopicsId>>>
export type GetApiTopicsIdQueryError = ErrorType<ErrorResponse>


export function useGetApiTopicsId<TData = Awaited<ReturnType<typeof getApiTopicsId>>, TError = ErrorType<ErrorResponse>>(
 id: string, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiTopicsId>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof getApiTopicsId>>,
          TError,
          Awaited<ReturnType<typeof getApiTopicsId>>
        > , 'initialData'
      >, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useGetApiTopicsId<TData = Awaited<ReturnType<typeof getApiTopicsId>>, TError = ErrorType<ErrorResponse>>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiTopicsId>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof getApiTopicsId>>,
          TError,
          Awaited<ReturnType<typeof getApiTopicsId>>
        > , 'initialData'
      >, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useGetApiTopicsId<TData = Awaited<ReturnType<typeof getApiTopicsId>>, TError = ErrorType<ErrorResponse>>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiTopicsId>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
/**
 * @summary Get topic details
 */

export function useGetApiTopicsId<TData = Awaited<ReturnType<typeof getApiTopicsId>>, TError = ErrorType<ErrorResponse>>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiTopicsId>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient 
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getGetApiTopicsIdQueryOptions(id,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return { ...query, queryKey: queryOptions.queryKey };
}





/**
 * Create a new deliberation topic (admin only)
 * @summary Create topic (admin)
 */
export type postApiAdminTopicsResponse201 = {
  data: GetTopicResponse
  status: 201
}

export type postApiAdminTopicsResponse400 = {
  data: ErrorResponse
  status: 400
}

export type postApiAdminTopicsResponse401 = {
  data: ErrorResponse
  status: 401
}

export type postApiAdminTopicsResponse500 = {
  data: ErrorResponse
  status: 500
}
    
export type postApiAdminTopicsResponseSuccess = (postApiAdminTopicsResponse201) & {
  headers: Headers;
};
export type postApiAdminTopicsResponseError = (postApiAdminTopicsResponse400 | postApiAdminTopicsResponse401 | postApiAdminTopicsResponse500) & {
  headers: Headers;
};

export type postApiAdminTopicsResponse = (postApiAdminTopicsResponseSuccess | postApiAdminTopicsResponseError)

export const getPostApiAdminTopicsUrl = () => {


  

  return `/api/admin/topics`
}

export const postApiAdminTopics = async (createTopicRequest: CreateTopicRequest, options?: RequestInit): Promise<postApiAdminTopicsResponse> => {
  
  return customBackendClient<postApiAdminTopicsResponse>(getPostApiAdminTopicsUrl(),
  {      
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(
      createTopicRequest,)
  }
);}




export const getPostApiAdminTopicsMutationOptions = <TError = ErrorType<ErrorResponse>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof postApiAdminTopics>>, TError,{data: CreateTopicRequest}, TContext>, request?: SecondParameter<typeof customBackendClient>}
): UseMutationOptions<Awaited<ReturnType<typeof postApiAdminTopics>>, TError,{data: CreateTopicRequest}, TContext> => {

const mutationKey = ['postApiAdminTopics'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};

      


      const mutationFn: MutationFunction<Awaited<ReturnType<typeof postApiAdminTopics>>, {data: CreateTopicRequest}> = (props) => {
          const {data} = props ?? {};

          return  postApiAdminTopics(data,requestOptions)
        }



        


  return  { mutationFn, ...mutationOptions }}

    export type PostApiAdminTopicsMutationResult = NonNullable<Awaited<ReturnType<typeof postApiAdminTopics>>>
    export type PostApiAdminTopicsMutationBody = CreateTopicRequest
    export type PostApiAdminTopicsMutationError = ErrorType<ErrorResponse>

    /**
 * @summary Create topic (admin)
 */
export const usePostApiAdminTopics = <TError = ErrorType<ErrorResponse>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof postApiAdminTopics>>, TError,{data: CreateTopicRequest}, TContext>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof postApiAdminTopics>>,
        TError,
        {data: CreateTopicRequest},
        TContext
      > => {
      return useMutation(getPostApiAdminTopicsMutationOptions(options), queryClient);
    }
    
/**
 * Create a new AI agent with an initial persona generated by LLM
 * @summary Create a new agent
 */
export type postApiAgentsResponse201 = {
  data: CreateAgentResponse
  status: 201
}

export type postApiAgentsResponse400 = {
  data: ErrorResponse
  status: 400
}

export type postApiAgentsResponse401 = {
  data: ErrorResponse
  status: 401
}

export type postApiAgentsResponse500 = {
  data: ErrorResponse
  status: 500
}
    
export type postApiAgentsResponseSuccess = (postApiAgentsResponse201) & {
  headers: Headers;
};
export type postApiAgentsResponseError = (postApiAgentsResponse400 | postApiAgentsResponse401 | postApiAgentsResponse500) & {
  headers: Headers;
};

export type postApiAgentsResponse = (postApiAgentsResponseSuccess | postApiAgentsResponseError)

export const getPostApiAgentsUrl = () => {


  

  return `/api/agents`
}

export const postApiAgents = async (createAgentRequest: CreateAgentRequest, options?: RequestInit): Promise<postApiAgentsResponse> => {
  
  return customBackendClient<postApiAgentsResponse>(getPostApiAgentsUrl(),
  {      
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(
      createAgentRequest,)
  }
);}




export const getPostApiAgentsMutationOptions = <TError = ErrorType<ErrorResponse>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof postApiAgents>>, TError,{data: CreateAgentRequest}, TContext>, request?: SecondParameter<typeof customBackendClient>}
): UseMutationOptions<Awaited<ReturnType<typeof postApiAgents>>, TError,{data: CreateAgentRequest}, TContext> => {

const mutationKey = ['postApiAgents'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};

      


      const mutationFn: MutationFunction<Awaited<ReturnType<typeof postApiAgents>>, {data: CreateAgentRequest}> = (props) => {
          const {data} = props ?? {};

          return  postApiAgents(data,requestOptions)
        }



        


  return  { mutationFn, ...mutationOptions }}

    export type PostApiAgentsMutationResult = NonNullable<Awaited<ReturnType<typeof postApiAgents>>>
    export type PostApiAgentsMutationBody = CreateAgentRequest
    export type PostApiAgentsMutationError = ErrorType<ErrorResponse>

    /**
 * @summary Create a new agent
 */
export const usePostApiAgents = <TError = ErrorType<ErrorResponse>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof postApiAgents>>, TError,{data: CreateAgentRequest}, TContext>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof postApiAgents>>,
        TError,
        {data: CreateAgentRequest},
        TContext
      > => {
      return useMutation(getPostApiAgentsMutationOptions(options), queryClient);
    }
    
/**
 * Get a list of all agents owned by the authenticated user
 * @summary List user's agents
 */
export type getApiAgentsResponse200 = {
  data: ListAgentsResponse
  status: 200
}

export type getApiAgentsResponse401 = {
  data: ErrorResponse
  status: 401
}

export type getApiAgentsResponse500 = {
  data: ErrorResponse
  status: 500
}
    
export type getApiAgentsResponseSuccess = (getApiAgentsResponse200) & {
  headers: Headers;
};
export type getApiAgentsResponseError = (getApiAgentsResponse401 | getApiAgentsResponse500) & {
  headers: Headers;
};

export type getApiAgentsResponse = (getApiAgentsResponseSuccess | getApiAgentsResponseError)

export const getGetApiAgentsUrl = () => {


  

  return `/api/agents`
}

export const getApiAgents = async ( options?: RequestInit): Promise<getApiAgentsResponse> => {
  
  return customBackendClient<getApiAgentsResponse>(getGetApiAgentsUrl(),
  {      
    ...options,
    method: 'GET'
    
    
  }
);}





export const getGetApiAgentsQueryKey = () => {
    return [
    `/api/agents`
    ] as const;
    }

    
export const getGetApiAgentsQueryOptions = <TData = Awaited<ReturnType<typeof getApiAgents>>, TError = ErrorType<ErrorResponse>>( options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgents>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetApiAgentsQueryKey();

  

    const queryFn: QueryFunction<Awaited<ReturnType<typeof getApiAgents>>> = ({ signal }) => getApiAgents({ signal, ...requestOptions });

      

      

   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getApiAgents>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type GetApiAgentsQueryResult = NonNullable<Awaited<ReturnType<typeof getApiAgents>>>
export type GetApiAgentsQueryError = ErrorType<ErrorResponse>


export function useGetApiAgents<TData = Awaited<ReturnType<typeof getApiAgents>>, TError = ErrorType<ErrorResponse>>(
  options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgents>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof getApiAgents>>,
          TError,
          Awaited<ReturnType<typeof getApiAgents>>
        > , 'initialData'
      >, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useGetApiAgents<TData = Awaited<ReturnType<typeof getApiAgents>>, TError = ErrorType<ErrorResponse>>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgents>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof getApiAgents>>,
          TError,
          Awaited<ReturnType<typeof getApiAgents>>
        > , 'initialData'
      >, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useGetApiAgents<TData = Awaited<ReturnType<typeof getApiAgents>>, TError = ErrorType<ErrorResponse>>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgents>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
/**
 * @summary List user's agents
 */

export function useGetApiAgents<TData = Awaited<ReturnType<typeof getApiAgents>>, TError = ErrorType<ErrorResponse>>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgents>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient 
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getGetApiAgentsQueryOptions(options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return { ...query, queryKey: queryOptions.queryKey };
}





/**
 * Get detailed information about a specific agent
 * @summary Get agent details
 */
export type getApiAgentsIdResponse200 = {
  data: GetAgentResponse
  status: 200
}

export type getApiAgentsIdResponse401 = {
  data: ErrorResponse
  status: 401
}

export type getApiAgentsIdResponse403 = {
  data: ErrorResponse
  status: 403
}

export type getApiAgentsIdResponse404 = {
  data: ErrorResponse
  status: 404
}

export type getApiAgentsIdResponse500 = {
  data: ErrorResponse
  status: 500
}
    
export type getApiAgentsIdResponseSuccess = (getApiAgentsIdResponse200) & {
  headers: Headers;
};
export type getApiAgentsIdResponseError = (getApiAgentsIdResponse401 | getApiAgentsIdResponse403 | getApiAgentsIdResponse404 | getApiAgentsIdResponse500) & {
  headers: Headers;
};

export type getApiAgentsIdResponse = (getApiAgentsIdResponseSuccess | getApiAgentsIdResponseError)

export const getGetApiAgentsIdUrl = (id: string,) => {


  

  return `/api/agents/${id}`
}

export const getApiAgentsId = async (id: string, options?: RequestInit): Promise<getApiAgentsIdResponse> => {
  
  return customBackendClient<getApiAgentsIdResponse>(getGetApiAgentsIdUrl(id),
  {      
    ...options,
    method: 'GET'
    
    
  }
);}





export const getGetApiAgentsIdQueryKey = (id: string,) => {
    return [
    `/api/agents/${id}`
    ] as const;
    }

    
export const getGetApiAgentsIdQueryOptions = <TData = Awaited<ReturnType<typeof getApiAgentsId>>, TError = ErrorType<ErrorResponse>>(id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsId>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetApiAgentsIdQueryKey(id);

  

    const queryFn: QueryFunction<Awaited<ReturnType<typeof getApiAgentsId>>> = ({ signal }) => getApiAgentsId(id, { signal, ...requestOptions });

      

      

   return  { queryKey, queryFn, enabled: !!(id), ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsId>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type GetApiAgentsIdQueryResult = NonNullable<Awaited<ReturnType<typeof getApiAgentsId>>>
export type GetApiAgentsIdQueryError = ErrorType<ErrorResponse>


export function useGetApiAgentsId<TData = Awaited<ReturnType<typeof getApiAgentsId>>, TError = ErrorType<ErrorResponse>>(
 id: string, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsId>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof getApiAgentsId>>,
          TError,
          Awaited<ReturnType<typeof getApiAgentsId>>
        > , 'initialData'
      >, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useGetApiAgentsId<TData = Awaited<ReturnType<typeof getApiAgentsId>>, TError = ErrorType<ErrorResponse>>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsId>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof getApiAgentsId>>,
          TError,
          Awaited<ReturnType<typeof getApiAgentsId>>
        > , 'initialData'
      >, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useGetApiAgentsId<TData = Awaited<ReturnType<typeof getApiAgentsId>>, TError = ErrorType<ErrorResponse>>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsId>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
/**
 * @summary Get agent details
 */

export function useGetApiAgentsId<TData = Awaited<ReturnType<typeof getApiAgentsId>>, TError = ErrorType<ErrorResponse>>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsId>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient 
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getGetApiAgentsIdQueryOptions(id,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return { ...query, queryKey: queryOptions.queryKey };
}





/**
 * Update agent information (currently only name can be updated)
 * @summary Update agent
 */
export type patchApiAgentsIdResponse200 = {
  data: UpdateAgentResponse
  status: 200
}

export type patchApiAgentsIdResponse400 = {
  data: ErrorResponse
  status: 400
}

export type patchApiAgentsIdResponse401 = {
  data: ErrorResponse
  status: 401
}

export type patchApiAgentsIdResponse403 = {
  data: ErrorResponse
  status: 403
}

export type patchApiAgentsIdResponse404 = {
  data: ErrorResponse
  status: 404
}

export type patchApiAgentsIdResponse500 = {
  data: ErrorResponse
  status: 500
}
    
export type patchApiAgentsIdResponseSuccess = (patchApiAgentsIdResponse200) & {
  headers: Headers;
};
export type patchApiAgentsIdResponseError = (patchApiAgentsIdResponse400 | patchApiAgentsIdResponse401 | patchApiAgentsIdResponse403 | patchApiAgentsIdResponse404 | patchApiAgentsIdResponse500) & {
  headers: Headers;
};

export type patchApiAgentsIdResponse = (patchApiAgentsIdResponseSuccess | patchApiAgentsIdResponseError)

export const getPatchApiAgentsIdUrl = (id: string,) => {


  

  return `/api/agents/${id}`
}

export const patchApiAgentsId = async (id: string,
    updateAgentRequest: UpdateAgentRequest, options?: RequestInit): Promise<patchApiAgentsIdResponse> => {
  
  return customBackendClient<patchApiAgentsIdResponse>(getPatchApiAgentsIdUrl(id),
  {      
    ...options,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(
      updateAgentRequest,)
  }
);}




export const getPatchApiAgentsIdMutationOptions = <TError = ErrorType<ErrorResponse>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof patchApiAgentsId>>, TError,{id: string;data: UpdateAgentRequest}, TContext>, request?: SecondParameter<typeof customBackendClient>}
): UseMutationOptions<Awaited<ReturnType<typeof patchApiAgentsId>>, TError,{id: string;data: UpdateAgentRequest}, TContext> => {

const mutationKey = ['patchApiAgentsId'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};

      


      const mutationFn: MutationFunction<Awaited<ReturnType<typeof patchApiAgentsId>>, {id: string;data: UpdateAgentRequest}> = (props) => {
          const {id,data} = props ?? {};

          return  patchApiAgentsId(id,data,requestOptions)
        }



        


  return  { mutationFn, ...mutationOptions }}

    export type PatchApiAgentsIdMutationResult = NonNullable<Awaited<ReturnType<typeof patchApiAgentsId>>>
    export type PatchApiAgentsIdMutationBody = UpdateAgentRequest
    export type PatchApiAgentsIdMutationError = ErrorType<ErrorResponse>

    /**
 * @summary Update agent
 */
export const usePatchApiAgentsId = <TError = ErrorType<ErrorResponse>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof patchApiAgentsId>>, TError,{id: string;data: UpdateAgentRequest}, TContext>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof patchApiAgentsId>>,
        TError,
        {id: string;data: UpdateAgentRequest},
        TContext
      > => {
      return useMutation(getPatchApiAgentsIdMutationOptions(options), queryClient);
    }
    
export interface UpdateAgentStatusRequest {
  /** Agent status (active = participates in deliberations, reserve = training only) */
  status: AgentStatusType;
}

export interface UpdateAgentStatusResponse {
  /** Agent ID */
  id: string;
  /** Agent status (active = participates in deliberations, reserve = training only) */
  status: AgentStatusType;
  /** Unix timestamp (seconds) when last updated */
  updated_at: number;
}

/**
 * Change agent status between active and reserve
 * @summary Update agent status
 */
export type patchApiAgentsIdStatusResponse200 = {
  data: UpdateAgentStatusResponse
  status: 200
}

export type patchApiAgentsIdStatusResponse400 = {
  data: ErrorResponse
  status: 400
}

export type patchApiAgentsIdStatusResponse401 = {
  data: ErrorResponse
  status: 401
}

export type patchApiAgentsIdStatusResponse403 = {
  data: ErrorResponse
  status: 403
}

export type patchApiAgentsIdStatusResponse404 = {
  data: ErrorResponse
  status: 404
}

export type patchApiAgentsIdStatusResponse409 = {
  data: ErrorResponse
  status: 409
}

export type patchApiAgentsIdStatusResponse500 = {
  data: ErrorResponse
  status: 500
}

export type patchApiAgentsIdStatusResponseSuccess = (patchApiAgentsIdStatusResponse200) & {
  headers: Headers;
};
export type patchApiAgentsIdStatusResponseError = (patchApiAgentsIdStatusResponse400 | patchApiAgentsIdStatusResponse401 | patchApiAgentsIdStatusResponse403 | patchApiAgentsIdStatusResponse404 | patchApiAgentsIdStatusResponse409 | patchApiAgentsIdStatusResponse500) & {
  headers: Headers;
};

export type patchApiAgentsIdStatusResponse = (patchApiAgentsIdStatusResponseSuccess | patchApiAgentsIdStatusResponseError)

export const getPatchApiAgentsIdStatusUrl = (id: string,) => {





  return `/api/agents/${id}/status`
}

export const patchApiAgentsIdStatus = async (id: string,
    updateAgentStatusRequest: UpdateAgentStatusRequest, options?: RequestInit): Promise<patchApiAgentsIdStatusResponse> => {

  return customBackendClient<patchApiAgentsIdStatusResponse>(getPatchApiAgentsIdStatusUrl(id),
  {
    ...options,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(
      updateAgentStatusRequest,)
  }
);}




export const getPatchApiAgentsIdStatusMutationOptions = <TError = ErrorType<ErrorResponse>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof patchApiAgentsIdStatus>>, TError,{id: string;data: UpdateAgentStatusRequest}, TContext>, request?: SecondParameter<typeof customBackendClient>}
): UseMutationOptions<Awaited<ReturnType<typeof patchApiAgentsIdStatus>>, TError,{id: string;data: UpdateAgentStatusRequest}, TContext> => {

const mutationKey = ['patchApiAgentsIdStatus'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof patchApiAgentsIdStatus>>, {id: string;data: UpdateAgentStatusRequest}> = (props) => {
          const {id,data} = props ?? {};

          return  patchApiAgentsIdStatus(id,data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type PatchApiAgentsIdStatusMutationResult = NonNullable<Awaited<ReturnType<typeof patchApiAgentsIdStatus>>>
    export type PatchApiAgentsIdStatusMutationBody = UpdateAgentStatusRequest
    export type PatchApiAgentsIdStatusMutationError = ErrorType<ErrorResponse>

    /**
 * @summary Update agent status
 */
export const usePatchApiAgentsIdStatus = <TError = ErrorType<ErrorResponse>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof patchApiAgentsIdStatus>>, TError,{id: string;data: UpdateAgentStatusRequest}, TContext>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof patchApiAgentsIdStatus>>,
        TError,
        {id: string;data: UpdateAgentStatusRequest},
        TContext
      > => {
      return useMutation(getPatchApiAgentsIdStatusMutationOptions(options), queryClient);
    }

/**
 * Delete an agent and all related data (knowledge, inputs, etc.)
 * @summary Delete agent
 */
export type deleteApiAgentsIdResponse200 = {
  data: SuccessResponse
  status: 200
}

export type deleteApiAgentsIdResponse401 = {
  data: ErrorResponse
  status: 401
}

export type deleteApiAgentsIdResponse403 = {
  data: ErrorResponse
  status: 403
}

export type deleteApiAgentsIdResponse404 = {
  data: ErrorResponse
  status: 404
}

export type deleteApiAgentsIdResponse500 = {
  data: ErrorResponse
  status: 500
}
    
export type deleteApiAgentsIdResponseSuccess = (deleteApiAgentsIdResponse200) & {
  headers: Headers;
};
export type deleteApiAgentsIdResponseError = (deleteApiAgentsIdResponse401 | deleteApiAgentsIdResponse403 | deleteApiAgentsIdResponse404 | deleteApiAgentsIdResponse500) & {
  headers: Headers;
};

export type deleteApiAgentsIdResponse = (deleteApiAgentsIdResponseSuccess | deleteApiAgentsIdResponseError)

export const getDeleteApiAgentsIdUrl = (id: string,) => {


  

  return `/api/agents/${id}`
}

export const deleteApiAgentsId = async (id: string, options?: RequestInit): Promise<deleteApiAgentsIdResponse> => {
  
  return customBackendClient<deleteApiAgentsIdResponse>(getDeleteApiAgentsIdUrl(id),
  {      
    ...options,
    method: 'DELETE'
    
    
  }
);}




export const getDeleteApiAgentsIdMutationOptions = <TError = ErrorType<ErrorResponse>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof deleteApiAgentsId>>, TError,{id: string}, TContext>, request?: SecondParameter<typeof customBackendClient>}
): UseMutationOptions<Awaited<ReturnType<typeof deleteApiAgentsId>>, TError,{id: string}, TContext> => {

const mutationKey = ['deleteApiAgentsId'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};

      


      const mutationFn: MutationFunction<Awaited<ReturnType<typeof deleteApiAgentsId>>, {id: string}> = (props) => {
          const {id} = props ?? {};

          return  deleteApiAgentsId(id,requestOptions)
        }



        


  return  { mutationFn, ...mutationOptions }}

    export type DeleteApiAgentsIdMutationResult = NonNullable<Awaited<ReturnType<typeof deleteApiAgentsId>>>
    
    export type DeleteApiAgentsIdMutationError = ErrorType<ErrorResponse>

    /**
 * @summary Delete agent
 */
export const useDeleteApiAgentsId = <TError = ErrorType<ErrorResponse>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof deleteApiAgentsId>>, TError,{id: string}, TContext>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof deleteApiAgentsId>>,
        TError,
        {id: string},
        TContext
      > => {
      return useMutation(getDeleteApiAgentsIdMutationOptions(options), queryClient);
    }
    
/**
 * Add a new knowledge entry to an agent's knowledge base
 * @summary Add knowledge to agent
 */
export type postApiAgentsAgentIdKnowledgeResponse201 = {
  data: CreateKnowledgeResponse
  status: 201
}

export type postApiAgentsAgentIdKnowledgeResponse400 = {
  data: ErrorResponse
  status: 400
}

export type postApiAgentsAgentIdKnowledgeResponse401 = {
  data: ErrorResponse
  status: 401
}

export type postApiAgentsAgentIdKnowledgeResponse403 = {
  data: ErrorResponse
  status: 403
}

export type postApiAgentsAgentIdKnowledgeResponse404 = {
  data: ErrorResponse
  status: 404
}

export type postApiAgentsAgentIdKnowledgeResponse500 = {
  data: ErrorResponse
  status: 500
}
    
export type postApiAgentsAgentIdKnowledgeResponseSuccess = (postApiAgentsAgentIdKnowledgeResponse201) & {
  headers: Headers;
};
export type postApiAgentsAgentIdKnowledgeResponseError = (postApiAgentsAgentIdKnowledgeResponse400 | postApiAgentsAgentIdKnowledgeResponse401 | postApiAgentsAgentIdKnowledgeResponse403 | postApiAgentsAgentIdKnowledgeResponse404 | postApiAgentsAgentIdKnowledgeResponse500) & {
  headers: Headers;
};

export type postApiAgentsAgentIdKnowledgeResponse = (postApiAgentsAgentIdKnowledgeResponseSuccess | postApiAgentsAgentIdKnowledgeResponseError)

export const getPostApiAgentsAgentIdKnowledgeUrl = (agentId: string,) => {


  

  return `/api/agents/${agentId}/knowledge`
}

export const postApiAgentsAgentIdKnowledge = async (agentId: string,
    createKnowledgeRequest: CreateKnowledgeRequest, options?: RequestInit): Promise<postApiAgentsAgentIdKnowledgeResponse> => {
  
  return customBackendClient<postApiAgentsAgentIdKnowledgeResponse>(getPostApiAgentsAgentIdKnowledgeUrl(agentId),
  {      
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(
      createKnowledgeRequest,)
  }
);}




export const getPostApiAgentsAgentIdKnowledgeMutationOptions = <TError = ErrorType<ErrorResponse>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof postApiAgentsAgentIdKnowledge>>, TError,{agentId: string;data: CreateKnowledgeRequest}, TContext>, request?: SecondParameter<typeof customBackendClient>}
): UseMutationOptions<Awaited<ReturnType<typeof postApiAgentsAgentIdKnowledge>>, TError,{agentId: string;data: CreateKnowledgeRequest}, TContext> => {

const mutationKey = ['postApiAgentsAgentIdKnowledge'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};

      


      const mutationFn: MutationFunction<Awaited<ReturnType<typeof postApiAgentsAgentIdKnowledge>>, {agentId: string;data: CreateKnowledgeRequest}> = (props) => {
          const {agentId,data} = props ?? {};

          return  postApiAgentsAgentIdKnowledge(agentId,data,requestOptions)
        }



        


  return  { mutationFn, ...mutationOptions }}

    export type PostApiAgentsAgentIdKnowledgeMutationResult = NonNullable<Awaited<ReturnType<typeof postApiAgentsAgentIdKnowledge>>>
    export type PostApiAgentsAgentIdKnowledgeMutationBody = CreateKnowledgeRequest
    export type PostApiAgentsAgentIdKnowledgeMutationError = ErrorType<ErrorResponse>

    /**
 * @summary Add knowledge to agent
 */
export const usePostApiAgentsAgentIdKnowledge = <TError = ErrorType<ErrorResponse>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof postApiAgentsAgentIdKnowledge>>, TError,{agentId: string;data: CreateKnowledgeRequest}, TContext>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof postApiAgentsAgentIdKnowledge>>,
        TError,
        {agentId: string;data: CreateKnowledgeRequest},
        TContext
      > => {
      return useMutation(getPostApiAgentsAgentIdKnowledgeMutationOptions(options), queryClient);
    }
    
/**
 * Get all knowledge entries for a specific agent
 * @summary List agent's knowledge
 */
export type getApiAgentsAgentIdKnowledgeResponse200 = {
  data: ListKnowledgeResponse
  status: 200
}

export type getApiAgentsAgentIdKnowledgeResponse401 = {
  data: ErrorResponse
  status: 401
}

export type getApiAgentsAgentIdKnowledgeResponse403 = {
  data: ErrorResponse
  status: 403
}

export type getApiAgentsAgentIdKnowledgeResponse404 = {
  data: ErrorResponse
  status: 404
}

export type getApiAgentsAgentIdKnowledgeResponse500 = {
  data: ErrorResponse
  status: 500
}
    
export type getApiAgentsAgentIdKnowledgeResponseSuccess = (getApiAgentsAgentIdKnowledgeResponse200) & {
  headers: Headers;
};
export type getApiAgentsAgentIdKnowledgeResponseError = (getApiAgentsAgentIdKnowledgeResponse401 | getApiAgentsAgentIdKnowledgeResponse403 | getApiAgentsAgentIdKnowledgeResponse404 | getApiAgentsAgentIdKnowledgeResponse500) & {
  headers: Headers;
};

export type getApiAgentsAgentIdKnowledgeResponse = (getApiAgentsAgentIdKnowledgeResponseSuccess | getApiAgentsAgentIdKnowledgeResponseError)

export const getGetApiAgentsAgentIdKnowledgeUrl = (agentId: string,) => {


  

  return `/api/agents/${agentId}/knowledge`
}

export const getApiAgentsAgentIdKnowledge = async (agentId: string, options?: RequestInit): Promise<getApiAgentsAgentIdKnowledgeResponse> => {
  
  return customBackendClient<getApiAgentsAgentIdKnowledgeResponse>(getGetApiAgentsAgentIdKnowledgeUrl(agentId),
  {      
    ...options,
    method: 'GET'
    
    
  }
);}





export const getGetApiAgentsAgentIdKnowledgeQueryKey = (agentId: string,) => {
    return [
    `/api/agents/${agentId}/knowledge`
    ] as const;
    }

    
export const getGetApiAgentsAgentIdKnowledgeQueryOptions = <TData = Awaited<ReturnType<typeof getApiAgentsAgentIdKnowledge>>, TError = ErrorType<ErrorResponse>>(agentId: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsAgentIdKnowledge>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetApiAgentsAgentIdKnowledgeQueryKey(agentId);

  

    const queryFn: QueryFunction<Awaited<ReturnType<typeof getApiAgentsAgentIdKnowledge>>> = ({ signal }) => getApiAgentsAgentIdKnowledge(agentId, { signal, ...requestOptions });

      

      

   return  { queryKey, queryFn, enabled: !!(agentId), ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsAgentIdKnowledge>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type GetApiAgentsAgentIdKnowledgeQueryResult = NonNullable<Awaited<ReturnType<typeof getApiAgentsAgentIdKnowledge>>>
export type GetApiAgentsAgentIdKnowledgeQueryError = ErrorType<ErrorResponse>


export function useGetApiAgentsAgentIdKnowledge<TData = Awaited<ReturnType<typeof getApiAgentsAgentIdKnowledge>>, TError = ErrorType<ErrorResponse>>(
 agentId: string, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsAgentIdKnowledge>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof getApiAgentsAgentIdKnowledge>>,
          TError,
          Awaited<ReturnType<typeof getApiAgentsAgentIdKnowledge>>
        > , 'initialData'
      >, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useGetApiAgentsAgentIdKnowledge<TData = Awaited<ReturnType<typeof getApiAgentsAgentIdKnowledge>>, TError = ErrorType<ErrorResponse>>(
 agentId: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsAgentIdKnowledge>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof getApiAgentsAgentIdKnowledge>>,
          TError,
          Awaited<ReturnType<typeof getApiAgentsAgentIdKnowledge>>
        > , 'initialData'
      >, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useGetApiAgentsAgentIdKnowledge<TData = Awaited<ReturnType<typeof getApiAgentsAgentIdKnowledge>>, TError = ErrorType<ErrorResponse>>(
 agentId: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsAgentIdKnowledge>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
/**
 * @summary List agent's knowledge
 */

export function useGetApiAgentsAgentIdKnowledge<TData = Awaited<ReturnType<typeof getApiAgentsAgentIdKnowledge>>, TError = ErrorType<ErrorResponse>>(
 agentId: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsAgentIdKnowledge>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient 
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getGetApiAgentsAgentIdKnowledgeQueryOptions(agentId,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return { ...query, queryKey: queryOptions.queryKey };
}





/**
 * Delete a specific knowledge entry
 * @summary Delete knowledge entry
 */
export type deleteApiKnowledgeIdResponse200 = {
  data: SuccessResponse
  status: 200
}

export type deleteApiKnowledgeIdResponse401 = {
  data: ErrorResponse
  status: 401
}

export type deleteApiKnowledgeIdResponse403 = {
  data: ErrorResponse
  status: 403
}

export type deleteApiKnowledgeIdResponse404 = {
  data: ErrorResponse
  status: 404
}

export type deleteApiKnowledgeIdResponse500 = {
  data: ErrorResponse
  status: 500
}
    
export type deleteApiKnowledgeIdResponseSuccess = (deleteApiKnowledgeIdResponse200) & {
  headers: Headers;
};
export type deleteApiKnowledgeIdResponseError = (deleteApiKnowledgeIdResponse401 | deleteApiKnowledgeIdResponse403 | deleteApiKnowledgeIdResponse404 | deleteApiKnowledgeIdResponse500) & {
  headers: Headers;
};

export type deleteApiKnowledgeIdResponse = (deleteApiKnowledgeIdResponseSuccess | deleteApiKnowledgeIdResponseError)

export const getDeleteApiKnowledgeIdUrl = (id: string,) => {


  

  return `/api/knowledge/${id}`
}

export const deleteApiKnowledgeId = async (id: string, options?: RequestInit): Promise<deleteApiKnowledgeIdResponse> => {
  
  return customBackendClient<deleteApiKnowledgeIdResponse>(getDeleteApiKnowledgeIdUrl(id),
  {      
    ...options,
    method: 'DELETE'
    
    
  }
);}




export const getDeleteApiKnowledgeIdMutationOptions = <TError = ErrorType<ErrorResponse>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof deleteApiKnowledgeId>>, TError,{id: string}, TContext>, request?: SecondParameter<typeof customBackendClient>}
): UseMutationOptions<Awaited<ReturnType<typeof deleteApiKnowledgeId>>, TError,{id: string}, TContext> => {

const mutationKey = ['deleteApiKnowledgeId'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};

      


      const mutationFn: MutationFunction<Awaited<ReturnType<typeof deleteApiKnowledgeId>>, {id: string}> = (props) => {
          const {id} = props ?? {};

          return  deleteApiKnowledgeId(id,requestOptions)
        }



        


  return  { mutationFn, ...mutationOptions }}

    export type DeleteApiKnowledgeIdMutationResult = NonNullable<Awaited<ReturnType<typeof deleteApiKnowledgeId>>>
    
    export type DeleteApiKnowledgeIdMutationError = ErrorType<ErrorResponse>

    /**
 * @summary Delete knowledge entry
 */
export const useDeleteApiKnowledgeId = <TError = ErrorType<ErrorResponse>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof deleteApiKnowledgeId>>, TError,{id: string}, TContext>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof deleteApiKnowledgeId>>,
        TError,
        {id: string},
        TContext
      > => {
      return useMutation(getDeleteApiKnowledgeIdMutationOptions(options), queryClient);
    }
    
/**
 * Provide a short tactical instruction (max 80 chars) to guide agent behavior for a specific turn
 * @summary Add direction to agent during session
 */
export type postApiAgentsAgentIdDirectionsResponse201 = {
  data: CreateDirectionResponse
  status: 201
}

export type postApiAgentsAgentIdDirectionsResponse400 = {
  data: ErrorResponse
  status: 400
}

export type postApiAgentsAgentIdDirectionsResponse401 = {
  data: ErrorResponse
  status: 401
}

export type postApiAgentsAgentIdDirectionsResponse403 = {
  data: ErrorResponse
  status: 403
}

export type postApiAgentsAgentIdDirectionsResponse404 = {
  data: ErrorResponse
  status: 404
}

export type postApiAgentsAgentIdDirectionsResponse409 = {
  data: ErrorResponse
  status: 409
}

export type postApiAgentsAgentIdDirectionsResponse500 = {
  data: ErrorResponse
  status: 500
}
    
export type postApiAgentsAgentIdDirectionsResponseSuccess = (postApiAgentsAgentIdDirectionsResponse201) & {
  headers: Headers;
};
export type postApiAgentsAgentIdDirectionsResponseError = (postApiAgentsAgentIdDirectionsResponse400 | postApiAgentsAgentIdDirectionsResponse401 | postApiAgentsAgentIdDirectionsResponse403 | postApiAgentsAgentIdDirectionsResponse404 | postApiAgentsAgentIdDirectionsResponse409 | postApiAgentsAgentIdDirectionsResponse500) & {
  headers: Headers;
};

export type postApiAgentsAgentIdDirectionsResponse = (postApiAgentsAgentIdDirectionsResponseSuccess | postApiAgentsAgentIdDirectionsResponseError)

export const getPostApiAgentsAgentIdDirectionsUrl = (agentId: string,) => {


  

  return `/api/agents/${agentId}/directions`
}

export const postApiAgentsAgentIdDirections = async (agentId: string,
    createDirectionRequest: CreateDirectionRequest, options?: RequestInit): Promise<postApiAgentsAgentIdDirectionsResponse> => {
  
  return customBackendClient<postApiAgentsAgentIdDirectionsResponse>(getPostApiAgentsAgentIdDirectionsUrl(agentId),
  {      
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(
      createDirectionRequest,)
  }
);}




export const getPostApiAgentsAgentIdDirectionsMutationOptions = <TError = ErrorType<ErrorResponse>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof postApiAgentsAgentIdDirections>>, TError,{agentId: string;data: CreateDirectionRequest}, TContext>, request?: SecondParameter<typeof customBackendClient>}
): UseMutationOptions<Awaited<ReturnType<typeof postApiAgentsAgentIdDirections>>, TError,{agentId: string;data: CreateDirectionRequest}, TContext> => {

const mutationKey = ['postApiAgentsAgentIdDirections'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};

      


      const mutationFn: MutationFunction<Awaited<ReturnType<typeof postApiAgentsAgentIdDirections>>, {agentId: string;data: CreateDirectionRequest}> = (props) => {
          const {agentId,data} = props ?? {};

          return  postApiAgentsAgentIdDirections(agentId,data,requestOptions)
        }



        


  return  { mutationFn, ...mutationOptions }}

    export type PostApiAgentsAgentIdDirectionsMutationResult = NonNullable<Awaited<ReturnType<typeof postApiAgentsAgentIdDirections>>>
    export type PostApiAgentsAgentIdDirectionsMutationBody = CreateDirectionRequest
    export type PostApiAgentsAgentIdDirectionsMutationError = ErrorType<ErrorResponse>

    /**
 * @summary Add direction to agent during session
 */
export const usePostApiAgentsAgentIdDirections = <TError = ErrorType<ErrorResponse>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof postApiAgentsAgentIdDirections>>, TError,{agentId: string;data: CreateDirectionRequest}, TContext>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof postApiAgentsAgentIdDirections>>,
        TError,
        {agentId: string;data: CreateDirectionRequest},
        TContext
      > => {
      return useMutation(getPostApiAgentsAgentIdDirectionsMutationOptions(options), queryClient);
    }
    
/**
 * Get directions for a specific agent, optionally filtered by session
 * @summary List agent's directions
 */
export type getApiAgentsAgentIdDirectionsResponse200 = {
  data: ListDirectionsResponse
  status: 200
}

export type getApiAgentsAgentIdDirectionsResponse401 = {
  data: ErrorResponse
  status: 401
}

export type getApiAgentsAgentIdDirectionsResponse403 = {
  data: ErrorResponse
  status: 403
}

export type getApiAgentsAgentIdDirectionsResponse404 = {
  data: ErrorResponse
  status: 404
}

export type getApiAgentsAgentIdDirectionsResponse500 = {
  data: ErrorResponse
  status: 500
}
    
export type getApiAgentsAgentIdDirectionsResponseSuccess = (getApiAgentsAgentIdDirectionsResponse200) & {
  headers: Headers;
};
export type getApiAgentsAgentIdDirectionsResponseError = (getApiAgentsAgentIdDirectionsResponse401 | getApiAgentsAgentIdDirectionsResponse403 | getApiAgentsAgentIdDirectionsResponse404 | getApiAgentsAgentIdDirectionsResponse500) & {
  headers: Headers;
};

export type getApiAgentsAgentIdDirectionsResponse = (getApiAgentsAgentIdDirectionsResponseSuccess | getApiAgentsAgentIdDirectionsResponseError)

export const getGetApiAgentsAgentIdDirectionsUrl = (agentId: string,
    params?: GetApiAgentsAgentIdDirectionsParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    
    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : value.toString())
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `/api/agents/${agentId}/directions?${stringifiedParams}` : `/api/agents/${agentId}/directions`
}

export const getApiAgentsAgentIdDirections = async (agentId: string,
    params?: GetApiAgentsAgentIdDirectionsParams, options?: RequestInit): Promise<getApiAgentsAgentIdDirectionsResponse> => {
  
  return customBackendClient<getApiAgentsAgentIdDirectionsResponse>(getGetApiAgentsAgentIdDirectionsUrl(agentId,params),
  {      
    ...options,
    method: 'GET'
    
    
  }
);}





export const getGetApiAgentsAgentIdDirectionsQueryKey = (agentId: string,
    params?: GetApiAgentsAgentIdDirectionsParams,) => {
    return [
    `/api/agents/${agentId}/directions`, ...(params ? [params] : [])
    ] as const;
    }

    
export const getGetApiAgentsAgentIdDirectionsQueryOptions = <TData = Awaited<ReturnType<typeof getApiAgentsAgentIdDirections>>, TError = ErrorType<ErrorResponse>>(agentId: string,
    params?: GetApiAgentsAgentIdDirectionsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsAgentIdDirections>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetApiAgentsAgentIdDirectionsQueryKey(agentId,params);

  

    const queryFn: QueryFunction<Awaited<ReturnType<typeof getApiAgentsAgentIdDirections>>> = ({ signal }) => getApiAgentsAgentIdDirections(agentId,params, { signal, ...requestOptions });

      

      

   return  { queryKey, queryFn, enabled: !!(agentId), ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsAgentIdDirections>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type GetApiAgentsAgentIdDirectionsQueryResult = NonNullable<Awaited<ReturnType<typeof getApiAgentsAgentIdDirections>>>
export type GetApiAgentsAgentIdDirectionsQueryError = ErrorType<ErrorResponse>


export function useGetApiAgentsAgentIdDirections<TData = Awaited<ReturnType<typeof getApiAgentsAgentIdDirections>>, TError = ErrorType<ErrorResponse>>(
 agentId: string,
    params: undefined |  GetApiAgentsAgentIdDirectionsParams, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsAgentIdDirections>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof getApiAgentsAgentIdDirections>>,
          TError,
          Awaited<ReturnType<typeof getApiAgentsAgentIdDirections>>
        > , 'initialData'
      >, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useGetApiAgentsAgentIdDirections<TData = Awaited<ReturnType<typeof getApiAgentsAgentIdDirections>>, TError = ErrorType<ErrorResponse>>(
 agentId: string,
    params?: GetApiAgentsAgentIdDirectionsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsAgentIdDirections>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof getApiAgentsAgentIdDirections>>,
          TError,
          Awaited<ReturnType<typeof getApiAgentsAgentIdDirections>>
        > , 'initialData'
      >, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useGetApiAgentsAgentIdDirections<TData = Awaited<ReturnType<typeof getApiAgentsAgentIdDirections>>, TError = ErrorType<ErrorResponse>>(
 agentId: string,
    params?: GetApiAgentsAgentIdDirectionsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsAgentIdDirections>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
/**
 * @summary List agent's directions
 */

export function useGetApiAgentsAgentIdDirections<TData = Awaited<ReturnType<typeof getApiAgentsAgentIdDirections>>, TError = ErrorType<ErrorResponse>>(
 agentId: string,
    params?: GetApiAgentsAgentIdDirectionsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsAgentIdDirections>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient 
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getGetApiAgentsAgentIdDirectionsQueryOptions(agentId,params,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return { ...query, queryKey: queryOptions.queryKey };
}





/**
 * Provide feedback (max 400 chars) for a completed session. One feedback per agent per session.
 * @summary Add feedback for a completed session
 */
export type postApiAgentsAgentIdFeedbacksResponse201 = {
  data: CreateFeedbackResponse
  status: 201
}

export type postApiAgentsAgentIdFeedbacksResponse400 = {
  data: ErrorResponse
  status: 400
}

export type postApiAgentsAgentIdFeedbacksResponse401 = {
  data: ErrorResponse
  status: 401
}

export type postApiAgentsAgentIdFeedbacksResponse403 = {
  data: ErrorResponse
  status: 403
}

export type postApiAgentsAgentIdFeedbacksResponse404 = {
  data: ErrorResponse
  status: 404
}

export type postApiAgentsAgentIdFeedbacksResponse409 = {
  data: ErrorResponse
  status: 409
}

export type postApiAgentsAgentIdFeedbacksResponse500 = {
  data: ErrorResponse
  status: 500
}
    
export type postApiAgentsAgentIdFeedbacksResponseSuccess = (postApiAgentsAgentIdFeedbacksResponse201) & {
  headers: Headers;
};
export type postApiAgentsAgentIdFeedbacksResponseError = (postApiAgentsAgentIdFeedbacksResponse400 | postApiAgentsAgentIdFeedbacksResponse401 | postApiAgentsAgentIdFeedbacksResponse403 | postApiAgentsAgentIdFeedbacksResponse404 | postApiAgentsAgentIdFeedbacksResponse409 | postApiAgentsAgentIdFeedbacksResponse500) & {
  headers: Headers;
};

export type postApiAgentsAgentIdFeedbacksResponse = (postApiAgentsAgentIdFeedbacksResponseSuccess | postApiAgentsAgentIdFeedbacksResponseError)

export const getPostApiAgentsAgentIdFeedbacksUrl = (agentId: string,) => {


  

  return `/api/agents/${agentId}/feedbacks`
}

export const postApiAgentsAgentIdFeedbacks = async (agentId: string,
    createFeedbackRequest: CreateFeedbackRequest, options?: RequestInit): Promise<postApiAgentsAgentIdFeedbacksResponse> => {
  
  return customBackendClient<postApiAgentsAgentIdFeedbacksResponse>(getPostApiAgentsAgentIdFeedbacksUrl(agentId),
  {      
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(
      createFeedbackRequest,)
  }
);}




export const getPostApiAgentsAgentIdFeedbacksMutationOptions = <TError = ErrorType<ErrorResponse>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof postApiAgentsAgentIdFeedbacks>>, TError,{agentId: string;data: CreateFeedbackRequest}, TContext>, request?: SecondParameter<typeof customBackendClient>}
): UseMutationOptions<Awaited<ReturnType<typeof postApiAgentsAgentIdFeedbacks>>, TError,{agentId: string;data: CreateFeedbackRequest}, TContext> => {

const mutationKey = ['postApiAgentsAgentIdFeedbacks'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};

      


      const mutationFn: MutationFunction<Awaited<ReturnType<typeof postApiAgentsAgentIdFeedbacks>>, {agentId: string;data: CreateFeedbackRequest}> = (props) => {
          const {agentId,data} = props ?? {};

          return  postApiAgentsAgentIdFeedbacks(agentId,data,requestOptions)
        }



        


  return  { mutationFn, ...mutationOptions }}

    export type PostApiAgentsAgentIdFeedbacksMutationResult = NonNullable<Awaited<ReturnType<typeof postApiAgentsAgentIdFeedbacks>>>
    export type PostApiAgentsAgentIdFeedbacksMutationBody = CreateFeedbackRequest
    export type PostApiAgentsAgentIdFeedbacksMutationError = ErrorType<ErrorResponse>

    /**
 * @summary Add feedback for a completed session
 */
export const usePostApiAgentsAgentIdFeedbacks = <TError = ErrorType<ErrorResponse>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof postApiAgentsAgentIdFeedbacks>>, TError,{agentId: string;data: CreateFeedbackRequest}, TContext>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof postApiAgentsAgentIdFeedbacks>>,
        TError,
        {agentId: string;data: CreateFeedbackRequest},
        TContext
      > => {
      return useMutation(getPostApiAgentsAgentIdFeedbacksMutationOptions(options), queryClient);
    }
    
/**
 * Get all feedbacks for a specific agent
 * @summary List agent's feedbacks
 */
export type getApiAgentsAgentIdFeedbacksResponse200 = {
  data: ListFeedbacksResponse
  status: 200
}

export type getApiAgentsAgentIdFeedbacksResponse401 = {
  data: ErrorResponse
  status: 401
}

export type getApiAgentsAgentIdFeedbacksResponse403 = {
  data: ErrorResponse
  status: 403
}

export type getApiAgentsAgentIdFeedbacksResponse404 = {
  data: ErrorResponse
  status: 404
}

export type getApiAgentsAgentIdFeedbacksResponse500 = {
  data: ErrorResponse
  status: 500
}
    
export type getApiAgentsAgentIdFeedbacksResponseSuccess = (getApiAgentsAgentIdFeedbacksResponse200) & {
  headers: Headers;
};
export type getApiAgentsAgentIdFeedbacksResponseError = (getApiAgentsAgentIdFeedbacksResponse401 | getApiAgentsAgentIdFeedbacksResponse403 | getApiAgentsAgentIdFeedbacksResponse404 | getApiAgentsAgentIdFeedbacksResponse500) & {
  headers: Headers;
};

export type getApiAgentsAgentIdFeedbacksResponse = (getApiAgentsAgentIdFeedbacksResponseSuccess | getApiAgentsAgentIdFeedbacksResponseError)

export const getGetApiAgentsAgentIdFeedbacksUrl = (agentId: string,
    params?: GetApiAgentsAgentIdFeedbacksParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    
    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : value.toString())
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `/api/agents/${agentId}/feedbacks?${stringifiedParams}` : `/api/agents/${agentId}/feedbacks`
}

export const getApiAgentsAgentIdFeedbacks = async (agentId: string,
    params?: GetApiAgentsAgentIdFeedbacksParams, options?: RequestInit): Promise<getApiAgentsAgentIdFeedbacksResponse> => {
  
  return customBackendClient<getApiAgentsAgentIdFeedbacksResponse>(getGetApiAgentsAgentIdFeedbacksUrl(agentId,params),
  {      
    ...options,
    method: 'GET'
    
    
  }
);}





export const getGetApiAgentsAgentIdFeedbacksQueryKey = (agentId: string,
    params?: GetApiAgentsAgentIdFeedbacksParams,) => {
    return [
    `/api/agents/${agentId}/feedbacks`, ...(params ? [params] : [])
    ] as const;
    }

    
export const getGetApiAgentsAgentIdFeedbacksQueryOptions = <TData = Awaited<ReturnType<typeof getApiAgentsAgentIdFeedbacks>>, TError = ErrorType<ErrorResponse>>(agentId: string,
    params?: GetApiAgentsAgentIdFeedbacksParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsAgentIdFeedbacks>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetApiAgentsAgentIdFeedbacksQueryKey(agentId,params);

  

    const queryFn: QueryFunction<Awaited<ReturnType<typeof getApiAgentsAgentIdFeedbacks>>> = ({ signal }) => getApiAgentsAgentIdFeedbacks(agentId,params, { signal, ...requestOptions });

      

      

   return  { queryKey, queryFn, enabled: !!(agentId), ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsAgentIdFeedbacks>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type GetApiAgentsAgentIdFeedbacksQueryResult = NonNullable<Awaited<ReturnType<typeof getApiAgentsAgentIdFeedbacks>>>
export type GetApiAgentsAgentIdFeedbacksQueryError = ErrorType<ErrorResponse>


export function useGetApiAgentsAgentIdFeedbacks<TData = Awaited<ReturnType<typeof getApiAgentsAgentIdFeedbacks>>, TError = ErrorType<ErrorResponse>>(
 agentId: string,
    params: undefined |  GetApiAgentsAgentIdFeedbacksParams, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsAgentIdFeedbacks>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof getApiAgentsAgentIdFeedbacks>>,
          TError,
          Awaited<ReturnType<typeof getApiAgentsAgentIdFeedbacks>>
        > , 'initialData'
      >, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useGetApiAgentsAgentIdFeedbacks<TData = Awaited<ReturnType<typeof getApiAgentsAgentIdFeedbacks>>, TError = ErrorType<ErrorResponse>>(
 agentId: string,
    params?: GetApiAgentsAgentIdFeedbacksParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsAgentIdFeedbacks>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof getApiAgentsAgentIdFeedbacks>>,
          TError,
          Awaited<ReturnType<typeof getApiAgentsAgentIdFeedbacks>>
        > , 'initialData'
      >, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useGetApiAgentsAgentIdFeedbacks<TData = Awaited<ReturnType<typeof getApiAgentsAgentIdFeedbacks>>, TError = ErrorType<ErrorResponse>>(
 agentId: string,
    params?: GetApiAgentsAgentIdFeedbacksParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsAgentIdFeedbacks>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
/**
 * @summary List agent's feedbacks
 */

export function useGetApiAgentsAgentIdFeedbacks<TData = Awaited<ReturnType<typeof getApiAgentsAgentIdFeedbacks>>, TError = ErrorType<ErrorResponse>>(
 agentId: string,
    params?: GetApiAgentsAgentIdFeedbacksParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsAgentIdFeedbacks>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient 
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getGetApiAgentsAgentIdFeedbacksQueryOptions(agentId,params,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return { ...query, queryKey: queryOptions.queryKey };
}





/**
 * Update feedback content before the next session starts
 * @summary Update feedback
 */
export type putApiAgentsAgentIdFeedbacksIdResponse200 = {
  data: Feedback
  status: 200
}

export type putApiAgentsAgentIdFeedbacksIdResponse400 = {
  data: ErrorResponse
  status: 400
}

export type putApiAgentsAgentIdFeedbacksIdResponse401 = {
  data: ErrorResponse
  status: 401
}

export type putApiAgentsAgentIdFeedbacksIdResponse403 = {
  data: ErrorResponse
  status: 403
}

export type putApiAgentsAgentIdFeedbacksIdResponse404 = {
  data: ErrorResponse
  status: 404
}

export type putApiAgentsAgentIdFeedbacksIdResponse500 = {
  data: ErrorResponse
  status: 500
}
    
export type putApiAgentsAgentIdFeedbacksIdResponseSuccess = (putApiAgentsAgentIdFeedbacksIdResponse200) & {
  headers: Headers;
};
export type putApiAgentsAgentIdFeedbacksIdResponseError = (putApiAgentsAgentIdFeedbacksIdResponse400 | putApiAgentsAgentIdFeedbacksIdResponse401 | putApiAgentsAgentIdFeedbacksIdResponse403 | putApiAgentsAgentIdFeedbacksIdResponse404 | putApiAgentsAgentIdFeedbacksIdResponse500) & {
  headers: Headers;
};

export type putApiAgentsAgentIdFeedbacksIdResponse = (putApiAgentsAgentIdFeedbacksIdResponseSuccess | putApiAgentsAgentIdFeedbacksIdResponseError)

export const getPutApiAgentsAgentIdFeedbacksIdUrl = (agentId: string,
    id: string,) => {


  

  return `/api/agents/${agentId}/feedbacks/${id}`
}

export const putApiAgentsAgentIdFeedbacksId = async (agentId: string,
    id: string,
    updateFeedbackRequest: UpdateFeedbackRequest, options?: RequestInit): Promise<putApiAgentsAgentIdFeedbacksIdResponse> => {
  
  return customBackendClient<putApiAgentsAgentIdFeedbacksIdResponse>(getPutApiAgentsAgentIdFeedbacksIdUrl(agentId,id),
  {      
    ...options,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(
      updateFeedbackRequest,)
  }
);}




export const getPutApiAgentsAgentIdFeedbacksIdMutationOptions = <TError = ErrorType<ErrorResponse>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof putApiAgentsAgentIdFeedbacksId>>, TError,{agentId: string;id: string;data: UpdateFeedbackRequest}, TContext>, request?: SecondParameter<typeof customBackendClient>}
): UseMutationOptions<Awaited<ReturnType<typeof putApiAgentsAgentIdFeedbacksId>>, TError,{agentId: string;id: string;data: UpdateFeedbackRequest}, TContext> => {

const mutationKey = ['putApiAgentsAgentIdFeedbacksId'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};

      


      const mutationFn: MutationFunction<Awaited<ReturnType<typeof putApiAgentsAgentIdFeedbacksId>>, {agentId: string;id: string;data: UpdateFeedbackRequest}> = (props) => {
          const {agentId,id,data} = props ?? {};

          return  putApiAgentsAgentIdFeedbacksId(agentId,id,data,requestOptions)
        }



        


  return  { mutationFn, ...mutationOptions }}

    export type PutApiAgentsAgentIdFeedbacksIdMutationResult = NonNullable<Awaited<ReturnType<typeof putApiAgentsAgentIdFeedbacksId>>>
    export type PutApiAgentsAgentIdFeedbacksIdMutationBody = UpdateFeedbackRequest
    export type PutApiAgentsAgentIdFeedbacksIdMutationError = ErrorType<ErrorResponse>

    /**
 * @summary Update feedback
 */
export const usePutApiAgentsAgentIdFeedbacksId = <TError = ErrorType<ErrorResponse>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof putApiAgentsAgentIdFeedbacksId>>, TError,{agentId: string;id: string;data: UpdateFeedbackRequest}, TContext>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof putApiAgentsAgentIdFeedbacksId>>,
        TError,
        {agentId: string;id: string;data: UpdateFeedbackRequest},
        TContext
      > => {
      return useMutation(getPutApiAgentsAgentIdFeedbacksIdMutationOptions(options), queryClient);
    }
    
/**
 * Get session strategies generated from feedback for a specific agent
 * @summary List agent's session strategies
 */
export type getApiAgentsAgentIdStrategiesResponse200 = {
  data: ListSessionStrategiesResponse
  status: 200
}

export type getApiAgentsAgentIdStrategiesResponse401 = {
  data: ErrorResponse
  status: 401
}

export type getApiAgentsAgentIdStrategiesResponse403 = {
  data: ErrorResponse
  status: 403
}

export type getApiAgentsAgentIdStrategiesResponse404 = {
  data: ErrorResponse
  status: 404
}

export type getApiAgentsAgentIdStrategiesResponse500 = {
  data: ErrorResponse
  status: 500
}
    
export type getApiAgentsAgentIdStrategiesResponseSuccess = (getApiAgentsAgentIdStrategiesResponse200) & {
  headers: Headers;
};
export type getApiAgentsAgentIdStrategiesResponseError = (getApiAgentsAgentIdStrategiesResponse401 | getApiAgentsAgentIdStrategiesResponse403 | getApiAgentsAgentIdStrategiesResponse404 | getApiAgentsAgentIdStrategiesResponse500) & {
  headers: Headers;
};

export type getApiAgentsAgentIdStrategiesResponse = (getApiAgentsAgentIdStrategiesResponseSuccess | getApiAgentsAgentIdStrategiesResponseError)

export const getGetApiAgentsAgentIdStrategiesUrl = (agentId: string,
    params?: GetApiAgentsAgentIdStrategiesParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    
    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : value.toString())
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `/api/agents/${agentId}/strategies?${stringifiedParams}` : `/api/agents/${agentId}/strategies`
}

export const getApiAgentsAgentIdStrategies = async (agentId: string,
    params?: GetApiAgentsAgentIdStrategiesParams, options?: RequestInit): Promise<getApiAgentsAgentIdStrategiesResponse> => {
  
  return customBackendClient<getApiAgentsAgentIdStrategiesResponse>(getGetApiAgentsAgentIdStrategiesUrl(agentId,params),
  {      
    ...options,
    method: 'GET'
    
    
  }
);}





export const getGetApiAgentsAgentIdStrategiesQueryKey = (agentId: string,
    params?: GetApiAgentsAgentIdStrategiesParams,) => {
    return [
    `/api/agents/${agentId}/strategies`, ...(params ? [params] : [])
    ] as const;
    }

    
export const getGetApiAgentsAgentIdStrategiesQueryOptions = <TData = Awaited<ReturnType<typeof getApiAgentsAgentIdStrategies>>, TError = ErrorType<ErrorResponse>>(agentId: string,
    params?: GetApiAgentsAgentIdStrategiesParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsAgentIdStrategies>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetApiAgentsAgentIdStrategiesQueryKey(agentId,params);

  

    const queryFn: QueryFunction<Awaited<ReturnType<typeof getApiAgentsAgentIdStrategies>>> = ({ signal }) => getApiAgentsAgentIdStrategies(agentId,params, { signal, ...requestOptions });

      

      

   return  { queryKey, queryFn, enabled: !!(agentId), ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsAgentIdStrategies>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type GetApiAgentsAgentIdStrategiesQueryResult = NonNullable<Awaited<ReturnType<typeof getApiAgentsAgentIdStrategies>>>
export type GetApiAgentsAgentIdStrategiesQueryError = ErrorType<ErrorResponse>


export function useGetApiAgentsAgentIdStrategies<TData = Awaited<ReturnType<typeof getApiAgentsAgentIdStrategies>>, TError = ErrorType<ErrorResponse>>(
 agentId: string,
    params: undefined |  GetApiAgentsAgentIdStrategiesParams, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsAgentIdStrategies>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof getApiAgentsAgentIdStrategies>>,
          TError,
          Awaited<ReturnType<typeof getApiAgentsAgentIdStrategies>>
        > , 'initialData'
      >, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useGetApiAgentsAgentIdStrategies<TData = Awaited<ReturnType<typeof getApiAgentsAgentIdStrategies>>, TError = ErrorType<ErrorResponse>>(
 agentId: string,
    params?: GetApiAgentsAgentIdStrategiesParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsAgentIdStrategies>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof getApiAgentsAgentIdStrategies>>,
          TError,
          Awaited<ReturnType<typeof getApiAgentsAgentIdStrategies>>
        > , 'initialData'
      >, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useGetApiAgentsAgentIdStrategies<TData = Awaited<ReturnType<typeof getApiAgentsAgentIdStrategies>>, TError = ErrorType<ErrorResponse>>(
 agentId: string,
    params?: GetApiAgentsAgentIdStrategiesParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsAgentIdStrategies>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
/**
 * @summary List agent's session strategies
 */

export function useGetApiAgentsAgentIdStrategies<TData = Awaited<ReturnType<typeof getApiAgentsAgentIdStrategies>>, TError = ErrorType<ErrorResponse>>(
 agentId: string,
    params?: GetApiAgentsAgentIdStrategiesParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiAgentsAgentIdStrategies>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient 
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getGetApiAgentsAgentIdStrategiesQueryOptions(agentId,params,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return { ...query, queryKey: queryOptions.queryKey };
}





/**
 * Get a list of deliberation sessions where the user's agents participated
 * @summary List sessions
 */
export type getApiSessionsResponse200 = {
  data: ListSessionsResponse
  status: 200
}

export type getApiSessionsResponse400 = {
  data: ErrorResponse
  status: 400
}

export type getApiSessionsResponse401 = {
  data: ErrorResponse
  status: 401
}

export type getApiSessionsResponse500 = {
  data: ErrorResponse
  status: 500
}
    
export type getApiSessionsResponseSuccess = (getApiSessionsResponse200) & {
  headers: Headers;
};
export type getApiSessionsResponseError = (getApiSessionsResponse400 | getApiSessionsResponse401 | getApiSessionsResponse500) & {
  headers: Headers;
};

export type getApiSessionsResponse = (getApiSessionsResponseSuccess | getApiSessionsResponseError)

export const getGetApiSessionsUrl = (params?: GetApiSessionsParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    
    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : value.toString())
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `/api/sessions?${stringifiedParams}` : `/api/sessions`
}

export const getApiSessions = async (params?: GetApiSessionsParams, options?: RequestInit): Promise<getApiSessionsResponse> => {
  
  return customBackendClient<getApiSessionsResponse>(getGetApiSessionsUrl(params),
  {      
    ...options,
    method: 'GET'
    
    
  }
);}





export const getGetApiSessionsQueryKey = (params?: GetApiSessionsParams,) => {
    return [
    `/api/sessions`, ...(params ? [params] : [])
    ] as const;
    }

    
export const getGetApiSessionsQueryOptions = <TData = Awaited<ReturnType<typeof getApiSessions>>, TError = ErrorType<ErrorResponse>>(params?: GetApiSessionsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiSessions>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetApiSessionsQueryKey(params);

  

    const queryFn: QueryFunction<Awaited<ReturnType<typeof getApiSessions>>> = ({ signal }) => getApiSessions(params, { signal, ...requestOptions });

      

      

   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getApiSessions>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type GetApiSessionsQueryResult = NonNullable<Awaited<ReturnType<typeof getApiSessions>>>
export type GetApiSessionsQueryError = ErrorType<ErrorResponse>


export function useGetApiSessions<TData = Awaited<ReturnType<typeof getApiSessions>>, TError = ErrorType<ErrorResponse>>(
 params: undefined |  GetApiSessionsParams, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiSessions>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof getApiSessions>>,
          TError,
          Awaited<ReturnType<typeof getApiSessions>>
        > , 'initialData'
      >, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useGetApiSessions<TData = Awaited<ReturnType<typeof getApiSessions>>, TError = ErrorType<ErrorResponse>>(
 params?: GetApiSessionsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiSessions>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof getApiSessions>>,
          TError,
          Awaited<ReturnType<typeof getApiSessions>>
        > , 'initialData'
      >, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useGetApiSessions<TData = Awaited<ReturnType<typeof getApiSessions>>, TError = ErrorType<ErrorResponse>>(
 params?: GetApiSessionsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiSessions>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
/**
 * @summary List sessions
 */

export function useGetApiSessions<TData = Awaited<ReturnType<typeof getApiSessions>>, TError = ErrorType<ErrorResponse>>(
 params?: GetApiSessionsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiSessions>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient 
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getGetApiSessionsQueryOptions(params,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return { ...query, queryKey: queryOptions.queryKey };
}





/**
 * Get detailed information about a specific deliberation session
 * @summary Get session details
 */
export type getApiSessionsIdResponse200 = {
  data: GetSessionResponse
  status: 200
}

export type getApiSessionsIdResponse401 = {
  data: ErrorResponse
  status: 401
}

export type getApiSessionsIdResponse404 = {
  data: ErrorResponse
  status: 404
}

export type getApiSessionsIdResponse500 = {
  data: ErrorResponse
  status: 500
}
    
export type getApiSessionsIdResponseSuccess = (getApiSessionsIdResponse200) & {
  headers: Headers;
};
export type getApiSessionsIdResponseError = (getApiSessionsIdResponse401 | getApiSessionsIdResponse404 | getApiSessionsIdResponse500) & {
  headers: Headers;
};

export type getApiSessionsIdResponse = (getApiSessionsIdResponseSuccess | getApiSessionsIdResponseError)

export const getGetApiSessionsIdUrl = (id: string,) => {


  

  return `/api/sessions/${id}`
}

export const getApiSessionsId = async (id: string, options?: RequestInit): Promise<getApiSessionsIdResponse> => {
  
  return customBackendClient<getApiSessionsIdResponse>(getGetApiSessionsIdUrl(id),
  {      
    ...options,
    method: 'GET'
    
    
  }
);}





export const getGetApiSessionsIdQueryKey = (id: string,) => {
    return [
    `/api/sessions/${id}`
    ] as const;
    }

    
export const getGetApiSessionsIdQueryOptions = <TData = Awaited<ReturnType<typeof getApiSessionsId>>, TError = ErrorType<ErrorResponse>>(id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiSessionsId>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetApiSessionsIdQueryKey(id);

  

    const queryFn: QueryFunction<Awaited<ReturnType<typeof getApiSessionsId>>> = ({ signal }) => getApiSessionsId(id, { signal, ...requestOptions });

      

      

   return  { queryKey, queryFn, enabled: !!(id), ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getApiSessionsId>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type GetApiSessionsIdQueryResult = NonNullable<Awaited<ReturnType<typeof getApiSessionsId>>>
export type GetApiSessionsIdQueryError = ErrorType<ErrorResponse>


export function useGetApiSessionsId<TData = Awaited<ReturnType<typeof getApiSessionsId>>, TError = ErrorType<ErrorResponse>>(
 id: string, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiSessionsId>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof getApiSessionsId>>,
          TError,
          Awaited<ReturnType<typeof getApiSessionsId>>
        > , 'initialData'
      >, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useGetApiSessionsId<TData = Awaited<ReturnType<typeof getApiSessionsId>>, TError = ErrorType<ErrorResponse>>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiSessionsId>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof getApiSessionsId>>,
          TError,
          Awaited<ReturnType<typeof getApiSessionsId>>
        > , 'initialData'
      >, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useGetApiSessionsId<TData = Awaited<ReturnType<typeof getApiSessionsId>>, TError = ErrorType<ErrorResponse>>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiSessionsId>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
/**
 * @summary Get session details
 */

export function useGetApiSessionsId<TData = Awaited<ReturnType<typeof getApiSessionsId>>, TError = ErrorType<ErrorResponse>>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiSessionsId>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient 
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getGetApiSessionsIdQueryOptions(id,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return { ...query, queryKey: queryOptions.queryKey };
}





/**
 * Get all turns and statements for a specific deliberation session
 * @summary Get session turns
 */
export type getApiSessionsIdTurnsResponse200 = {
  data: GetSessionTurnsResponse
  status: 200
}

export type getApiSessionsIdTurnsResponse401 = {
  data: ErrorResponse
  status: 401
}

export type getApiSessionsIdTurnsResponse404 = {
  data: ErrorResponse
  status: 404
}

export type getApiSessionsIdTurnsResponse500 = {
  data: ErrorResponse
  status: 500
}
    
export type getApiSessionsIdTurnsResponseSuccess = (getApiSessionsIdTurnsResponse200) & {
  headers: Headers;
};
export type getApiSessionsIdTurnsResponseError = (getApiSessionsIdTurnsResponse401 | getApiSessionsIdTurnsResponse404 | getApiSessionsIdTurnsResponse500) & {
  headers: Headers;
};

export type getApiSessionsIdTurnsResponse = (getApiSessionsIdTurnsResponseSuccess | getApiSessionsIdTurnsResponseError)

export const getGetApiSessionsIdTurnsUrl = (id: string,) => {


  

  return `/api/sessions/${id}/turns`
}

export const getApiSessionsIdTurns = async (id: string, options?: RequestInit): Promise<getApiSessionsIdTurnsResponse> => {
  
  return customBackendClient<getApiSessionsIdTurnsResponse>(getGetApiSessionsIdTurnsUrl(id),
  {      
    ...options,
    method: 'GET'
    
    
  }
);}





export const getGetApiSessionsIdTurnsQueryKey = (id: string,) => {
    return [
    `/api/sessions/${id}/turns`
    ] as const;
    }

    
export const getGetApiSessionsIdTurnsQueryOptions = <TData = Awaited<ReturnType<typeof getApiSessionsIdTurns>>, TError = ErrorType<ErrorResponse>>(id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiSessionsIdTurns>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetApiSessionsIdTurnsQueryKey(id);

  

    const queryFn: QueryFunction<Awaited<ReturnType<typeof getApiSessionsIdTurns>>> = ({ signal }) => getApiSessionsIdTurns(id, { signal, ...requestOptions });

      

      

   return  { queryKey, queryFn, enabled: !!(id), ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getApiSessionsIdTurns>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type GetApiSessionsIdTurnsQueryResult = NonNullable<Awaited<ReturnType<typeof getApiSessionsIdTurns>>>
export type GetApiSessionsIdTurnsQueryError = ErrorType<ErrorResponse>


export function useGetApiSessionsIdTurns<TData = Awaited<ReturnType<typeof getApiSessionsIdTurns>>, TError = ErrorType<ErrorResponse>>(
 id: string, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiSessionsIdTurns>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof getApiSessionsIdTurns>>,
          TError,
          Awaited<ReturnType<typeof getApiSessionsIdTurns>>
        > , 'initialData'
      >, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useGetApiSessionsIdTurns<TData = Awaited<ReturnType<typeof getApiSessionsIdTurns>>, TError = ErrorType<ErrorResponse>>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiSessionsIdTurns>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof getApiSessionsIdTurns>>,
          TError,
          Awaited<ReturnType<typeof getApiSessionsIdTurns>>
        > , 'initialData'
      >, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useGetApiSessionsIdTurns<TData = Awaited<ReturnType<typeof getApiSessionsIdTurns>>, TError = ErrorType<ErrorResponse>>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiSessionsIdTurns>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
/**
 * @summary Get session turns
 */

export function useGetApiSessionsIdTurns<TData = Awaited<ReturnType<typeof getApiSessionsIdTurns>>, TError = ErrorType<ErrorResponse>>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiSessionsIdTurns>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getGetApiSessionsIdTurnsQueryOptions(id,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return { ...query, queryKey: queryOptions.queryKey };
}


// ============================================================================
// Feedback Requests (manually added - run `pnpm orval` to regenerate)
// ============================================================================

export interface FeedbackRequest {
  agent_id: string;
  agent_name: string;
  session_id: string;
  topic_title: string;
  completed_at: number;
}

export interface ListFeedbackRequestsResponse {
  feedback_requests: FeedbackRequest[];
}

export type getApiFeedbackRequestsResponse200 = {
  data: ListFeedbackRequestsResponse
  status: 200
}

export type getApiFeedbackRequestsResponse401 = {
  data: ErrorResponse
  status: 401
}

export type getApiFeedbackRequestsResponse500 = {
  data: ErrorResponse
  status: 500
}

export type getApiFeedbackRequestsResponseSuccess = (getApiFeedbackRequestsResponse200) & {
  headers: Headers;
};
export type getApiFeedbackRequestsResponseError = (getApiFeedbackRequestsResponse401 | getApiFeedbackRequestsResponse500) & {
  headers: Headers;
};

export type getApiFeedbackRequestsResponse = (getApiFeedbackRequestsResponseSuccess | getApiFeedbackRequestsResponseError)

export const getGetApiFeedbackRequestsUrl = () => {
  return `/api/feedback-requests`
}

export const getApiFeedbackRequests = async ( options?: RequestInit): Promise<getApiFeedbackRequestsResponse> => {
  return customBackendClient<getApiFeedbackRequestsResponse>(getGetApiFeedbackRequestsUrl(),
  {
    ...options,
    method: 'GET'
  }
);}

export const getGetApiFeedbackRequestsQueryKey = () => {
    return [
    `/api/feedback-requests`
    ] as const;
    }

export const getGetApiFeedbackRequestsQueryOptions = <TData = Awaited<ReturnType<typeof getApiFeedbackRequests>>, TError = ErrorType<ErrorResponse>>( options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiFeedbackRequests>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetApiFeedbackRequestsQueryKey();

    const queryFn: QueryFunction<Awaited<ReturnType<typeof getApiFeedbackRequests>>> = ({ signal }) => getApiFeedbackRequests({ signal, ...requestOptions });

   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getApiFeedbackRequests>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type GetApiFeedbackRequestsQueryResult = NonNullable<Awaited<ReturnType<typeof getApiFeedbackRequests>>>
export type GetApiFeedbackRequestsQueryError = ErrorType<ErrorResponse>

/**
 * @summary List pending feedback requests
 */
export function useGetApiFeedbackRequests<TData = Awaited<ReturnType<typeof getApiFeedbackRequests>>, TError = ErrorType<ErrorResponse>>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getApiFeedbackRequests>>, TError, TData>>, request?: SecondParameter<typeof customBackendClient>}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getGetApiFeedbackRequestsQueryOptions(options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return { ...query, queryKey: queryOptions.queryKey };
}
