---
layout: post
title: C++11：右值引用、移动语意与完美转发
lang: zh-CN
---

在C++11之前我们很少听说左值、右值这个叫法，自从C++11支持了右值引用之后，大多数人会像我一样疑惑：啥是右值？

准确的来说：
1. 左值：拥有可辨识的内存地址的标识符便是一个左值。
2. 右值：非左值。
3. 左值引用：左值标识符的一个别名，简称引用
4. 右值引用：右值标识符的一个别名

<!--more--> 

举例：
```cpp
int a = 5；     //a为左值，5为右值
int* pA = &a;   //pA为左值，&a为右值
int& refA = a;  //refA是一个左值引用，C++11之前简称引用，a为右值
int&& rVal = 5; //rVal是一个右值引用。
```
上面的例子还可看出：左值有时可作为右值使用，而右值则永远无法作为左值使用。

右值引用还有一种通俗的定义：临时的对象便是一个右值。
右值引用有何作用呢？ 我们先假设有一个类：
```cpp
class Animal{
	int* m_dataArr;
	int  m_dataLength;
public:
	Animal(){
		m_dataLength = 10;
		m_dataArr = new int[m_dataLength ];
		//init
		...
	}
	//拷贝构造函数
	Animal(const Animal& obj){
		m_dataLength = obj.m_dataLength;
		m_dataArr = new int[m_dataLength];
		//copy
		for(int i=0; i<m_dataLength; i++){
			...
		}
	}
	//赋值操作符
	Animal& operator=(const Animal& obj){
		if(this != &obj){
			//像Animal(const Animal& obj)函数一样进行拷贝操作
			...
		}
		return *this;
	}
	~Animal(){
		delete[] m_dataArr;
	}
}
```
####  作用一：移动语意
又整一新词儿，啥叫“移动语意”？
拷贝构造函数大家应该都很熟悉——这个constructor负责把一个对象里的数据**拷贝**到自己对象中，克隆一个自己。我们可以把这个行为称作**拷贝语意**。典型场景——实参拷贝到形参。
```cpp
void SomeFunc(Animal x){ ... }
Animal CreateAnimal(){ ... }

Animal cat;
SomeFunc(cat); //此处会调用拷贝构造函数将cat里的数据拷贝到x中。
cat....
```
假如SomeFunc(cat);之后，不再引用cat了，我们经常这样写：
```cpp
SomeFunc(CreateAnimal()); //新创建的对象会被拷贝给x然后被销毁——极为浪费。
```
在此种情况下，拷贝显得极为浪费——刚产生出的对象，被拷贝一份之后立即被销毁——为何不直接使用刚刚创建出的对象里的数据而避免不必要的拷贝？

此时**移动语意**就很容易理解了：一个constructor负责把一个对象里的数据**移动**到自己对象中。这里有个前提：被掏空的对象必须是一个 临时对象，他被掏空之后不会再被引用到——这意味着掏空他后可以立即销毁。这个负责掏空别人的constructor便是**移动构造函数** 与 **移动赋值操作符**。此时的Animal类变成这样的了：

```cpp
class Animal{
	int* m_dataArr;
	int  m_dataLength;
public:
	Animal(){
		m_dataLength = 10;
		m_dataArr = new int[m_dataLength ];
		//init
		...
	}
	//拷贝构造函数
	Animal(const Animal& obj){
		m_dataLength = obj.m_dataLength;
		m_dataArr = new int[m_dataLength];
		//copy
		for(int i=0; i<m_dataLength; i++){
			...
		}
	}
	//移动构造函数
	Animal(Animal&& obj){
		m_dataLength = obj.m_dataLength;
		m_dataArr = obj.m_dataArr; //将obj内的数组指针直接拿来用
		obj.m_dataArr= nullptr;    //将obj内的数组指针,防止稍后obj析构时销毁m_data。
	}
	Animal& operator=(const Animal& obj){
		if(this != &obj){
			delete m_dataArr;
			//像Animal(const Animal& obj)函数一样进行拷贝操作
			...
		}
		return *this;
	}
	Animal& operator=(Animal&& obj){
		assert(this != &obj);
		delete m_dataArr;
		//像Animal(Animal&& obj)一样进行移动
		...
	}
	~Animal(){
		delete[] m_dataArr;
	}
}
```
我们暂时忽略赋值操作符与移动操作符的细节，只讨论拷贝构造与移动构造。
接下来我们为SomeFunc增加一个重载，变成这样：
```cpp
//void SomeFunc(Animal x){ ... }         //普通版本，不能与下面两个版本共存，会导致调用时的不确定
void SomeFunc(Animal& x){ ... }          //左值引用版本
void SomeFuncR(Animal&& x){ 	...  }	 //右值引用版本

Animal cat;
SomeFunc(cat); 				    //cat是一个左值，调用void SomeFunc(Animal& x)版本
SomeFunc(CreateAnimal()); 		//CreateAnimal()返回一个右值，调用void SomeFunc(Animal&& x)版本，执行移动构造
SomeFunc(std::move(cat));	    //调用void SomeFunc(Animal&& x)版本，执行移动构造，cat会被掏空，但不会被立即析构，cat的析构要等到它的生存期结束。
```
一般我们写C++函数传递参数时，一般使用左值引用。但是当实参是常量是就无法再使用左值引用版本的函数了，右值应用此时可以补上。

####  作用二：完美转发(Perfect Forwarding) 

移动语意较容易理解，完美转发就没那么直观了，我们先通过代码看下什么是“转发”与“不完美转发”。
```cpp
template <typename T>
void TempFunc(T t){
	//TempFunc模板函数会把t传递给SomeFunc，这个过程便称为实参转发（Argument Forwarding）
	SomeFunc(t);
}
```
在移动语意部分，我们知道，SomeFunc(cat)会匹配左值引用版本的SomeFunc，而SomeFunc(CreateAnimal())匹配右值引用版本的SomeFunc。现在我们在SomeFunc外面包了一层壳：TempFunc，考虑如下调用：
```cpp
	TempFunc(cat);
	TempFunc(CreateAnimal());
```
TempFunc的内部会分别匹配哪个版本的SomeFunc呢？答案是：上两行代码都会匹配左值引用版本的SomeFunc。
Holy shit！
为啥会这样？
因为所有的形参都是左值。

如何才能让TempFunc(CreateAnimal())匹配右值引用版本的SomeFunc，实现**完美转发**呢？
这么干：
```cpp
template <typename T>
void TempFunc(T&& t){//此处的T&&称为万能引用
	SomeFunc(std::forward<T>(t));
}
```
这样定义模板函数，即可实现完美转发，当调用TempFunc(cat)时，会匹配左值引用版本的SomeFunc；当调用TempFunc(CreateAnimal())时，匹配右值引用版本的SomeFunc。

关于为何上述代码能够实现完美转发以及std::move与std::forward的内部实现，请移步另一篇博客。

