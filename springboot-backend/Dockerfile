# ===== 阶段1: 用 Maven 打包 =====
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /build

# 配置阿里云 Maven 镜像加速（国内服务器必须）
RUN mkdir -p /root/.m2 && cat > /root/.m2/settings.xml << 'EOF'
<settings>
  <mirrors>
    <mirror>
      <id>aliyun</id>
      <mirrorOf>central</mirrorOf>
      <name>Aliyun Maven</name>
      <url>https://maven.aliyun.com/repository/public</url>
    </mirror>
  </mirrors>
</settings>
EOF

# 先只复制 pom.xml，利用 Docker 缓存加速依赖下载
COPY pom.xml .
RUN mvn dependency:go-offline -B
# 复制源码并打包（跳过测试）
COPY src ./src
RUN mvn package -DskipTests -B -q

# ===== 阶段2: 运行时镜像（体积小） =====
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
# 从构建阶段复制 jar
COPY --from=builder /build/target/*.jar app.jar
# 上传文件目录
RUN mkdir -p /app/uploads
EXPOSE 8080
# 通过 SPRING_PROFILES_ACTIVE=prod 激活生产配置
ENV SPRING_PROFILES_ACTIVE=prod
ENV JAVA_OPTS="-Xmx384m -Xms128m"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
