export type Expansion
	= 'attachments.poll_ids'
	| 'attachments.media_keys'
	| 'author_id'
	| 'entities.mentions.username'
	| 'geo.place_id'
	| 'in_reply_to_user_id'
	| 'referenced_tweets.id'
	| 'referenced_tweets.id.author_id';

export type MediaField
	= 'duration_ms'
	| 'height'
	| 'media_key'
	| 'preview_image_url'
	| 'type'
	| 'url'
	| 'width'
	| 'public_metrics';

export type PlaceField
	= 'contained_within'
	| 'country'
	| 'country_code'
	| 'full_name'
	| 'geo'
	| 'id'
	| 'name'
	| 'place_type';

export type PollField
	= 'duration_minutes'
	| 'end_datetime'
	| 'id'
	| 'options'
	| 'voting_status';

export type TweetField
	= 'attachments'
	| 'author_id'
	| 'context_annotations'
	| 'conversation_id'
	| 'created_at'
	| 'entities'
	| 'geo'
	| 'id'
	| 'in_reply_to_user_id'
	| 'lang'
	| 'public_metrics'
	| 'possibly_sensitive'
	| 'referenced_tweets'
	| 'source'
	| 'text'
	| 'withheld';

export type UserField
	= 'created_at'
	| 'description'
	| 'entities'
	| 'id'
	| 'location'
	| 'name'
	| 'pinned_tweet_id'
	| 'profile_image_url'
	| 'protected'
	| 'public_metrics'
	| 'url'
	| 'username'
	| 'verified'
	| 'withheld';

export interface FieldOpts<T> {
	fields: T[];
}

/**
 * @see {@link https://developer.twitter.com/en/docs/twitter-api/tweets/filtered-stream/api-reference/get-tweets-search-stream}
 */
export interface StreamOptions {
	expansions?: Expansion[];
	media?: FieldOpts<MediaField>;
	place?: FieldOpts<PlaceField>;
	poll?: FieldOpts<PollField>;
	tweet?: FieldOpts<TweetField>;
	user?: FieldOpts<UserField>;
}
