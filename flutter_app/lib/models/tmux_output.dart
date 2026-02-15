class TmuxOutput {
  final String content;
  final String timestamp;
  final String target;

  const TmuxOutput({
    required this.content,
    required this.timestamp,
    required this.target,
  });

  factory TmuxOutput.fromJson(Map<String, dynamic> json) {
    return TmuxOutput(
      content: json['content'] as String? ?? '',
      timestamp: json['timestamp'] as String? ?? '',
      target: json['target'] as String? ?? '',
    );
  }

  TmuxOutput copyWith({String? content, String? timestamp, String? target}) {
    return TmuxOutput(
      content: content ?? this.content,
      timestamp: timestamp ?? this.timestamp,
      target: target ?? this.target,
    );
  }
}
