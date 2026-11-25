from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Notification, User


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, style={"input_type": "password"})
    full_name = serializers.SerializerMethodField()
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True, default=None)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name", "full_name", "role", "role_display",
            "phone", "warehouse", "warehouse_name", "is_active", "password", "date_joined",
        ]
        read_only_fields = ["date_joined"]

    def get_full_name(self, obj):
        return obj.display_name

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": "Password wajib diisi."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class ProfileSerializer(serializers.ModelSerializer):
    """Field yang boleh diubah user pada profilnya sendiri."""

    class Meta:
        model = User
        fields = ["first_name", "last_name", "email", "phone"]


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField()

    def validate_new_password(self, value):
        validate_password(value)
        return value


class LoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "title", "message", "level", "is_read", "created_at", "warehouse"]
        read_only_fields = ["title", "message", "level", "created_at", "warehouse"]
