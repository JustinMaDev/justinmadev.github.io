---
layout: post
title: C++11新特性之——新标准库
lang: zh-CN
---

新版本的标准库添加了许多新的特性，本文只介绍特性的简单使用，不做原理上的探究，否则篇幅将无法控制。

<!--more--> 

##### 1.智能指针std::shared_prt、std::make_shared、std::unique_ptr、std::weak_ptr
C++码农苦new与delete久矣。使用new与delete除了经常会导致内存泄露（new之后忘了delete）之外，还经常出现delete之后继续引用、delete之后重复delete等情况，令人防不胜防。有了智能指针日子就好过多了——前提是得正确的使用它们。错误的使用反而会使bug更加隐晦。
>*  shared_prt是这样一个东西：它管理一个动态的对象，并维护一个引用计数，允许多个shared_prt指向这个对象，每多一个shared_prt指向（shared_ptr之间赋值、拷贝等操作）这个对象，引用计数增1,当引用计数为0时，销毁该对象。
>* unique_ptr则独立拥有一个动态对象，不允许多个智能指针指向这个对象。因此unique_ptr不支持拷贝或者赋值操作，但是支持移动操作(移动赋值与移动拷贝)。
>* weak_prt则是一个小喽啰，它不负责管理对象的销毁，只是简单地指向shared_ptr所管理的对象，当一个weak_ptr绑定到一个shared_ptr时，不影响改shared_ptr的引用计数。——weak_ptr更轻量。
>
容易引发错误的使用习惯：
~~~ cpp
int * pa = new int(10);
shared_ptr<int> spb(pa); //将动态对象的管理权交给了shared_ptr
shared_ptr<int> spc(spb.get()); //禁止使用get返回的指针初始化另一个shared_ptr，spb的引用计数没有增加，会导致异常
delete spb.get(); //禁止手动delete动态对象管理的内存。
weak_ptr<int> wpd(spb); //使用shared_ptr初始化一个weak_ptr。

......
*pa = 11; //此时动态对象有可能已被销毁；
~~~ 
正确使用上述三种智能指针的示例：
~~~ cpp
auto pa = make_shared<int> (10);
auto pb = pa;
~~~

##### 2. std::move、std::forward
移动语义的影子在C++11标准库中随处可见，他避免了很多不必要的拷贝，提升了性能。move方法能够将一个左值在编译期转换为右值。关于move与forward的用法与原理在另外两篇博客中有讨论，这里从略。
##### 3. std::function、std::bind
C++中有这样几种对象是可以被调用的，它们被称为“**可调用对象**”
>* 普通函数
>* lambda表达式
>* 函数指针
>* 实现了operator()的对象（functor）
>* 成员函数

它们的使用方法各不相同，有了std::function之后，可以将它们以相同的形式来调用了(成员函数除外)。std::function 是一个可调用对象包装器，是一个类模板，可以容纳除了类成员函数指针之外的所有可调用对象，它可以用统一的方式处理函数、函数对象、函数指针，并允许保存和延迟它们的执行。
而std::bind则可以绑定一个可调用对象与部分参数，并将返回一个std::function 类型的结果。使用bind可以完美处理成员函数的调用——成员函数本质上就是多了一个隐含的this指针，将成员函数与对象地址邦定一下，就是一个普通的可调用对象了。
~~~cpp
int add(int a, int b){ ...... }

class Minus{
	int operator()(int a, int b){.....}
}
Minus minusObj;
auto add2 = add; //调用add2(3, 4)等价于调用add(3, 4)。add2的类型为std::function<int(int,int)>
auto minus2 = std::bind(Minus::operaotr(), &minusObj);//调用minus2(3, 4)等价于调用minusObj(3, 4)
//bind还可以减少参数的数量，简化代码
auto minus3 = std::bind(Minus::operaotr(), &minusObj, 3);//调用minus3(4)等价于调用minusObj(3, 4)
~~~
有了std::function与std::bind极大地简化了的回调等模式的代码，可以将继承关系变为聚合关系，好多绕绕的设计模式可以省下了。
##### 4. std::initializer_list
在C++11之前，我们要想用一些值初始化一个vector，就得这么干：
~~~cpp
vector<int> vec03;
vec03.push_back(1);
vec03.push_back(2);
......
vector<int> vec11 = {1,2,3}; //c++11

int a = 3.3; //取整
int b = {3.3}//警告或报错
~~~
其中用到的便是C++11的initializer_list,包含在标准库头文件中。
不仅STL中的类型可以用这个操作，普通的内置类型也推荐使用该操作，因为类型检查更加严格。另外，自定义的类，在实现了一个特殊的构造函数之后，也会支持这种形式的初始化！

~~~cpp
class Num
{
  private:
    std::vector<int> m_vec;
  public:
    Num(const std::initializer_list<int> &v){
        for (auto a : v){
            m_vec.push_back(a);
        }
    }
}
int main{
	Num num = {4,5,6};
	return 0;
}
~~~

##### 5. std::tuple 与 std::tie
tupple, 与vector array之流最大的不同在于，后者存的元素都是相同类型，前者存的元素可以是不同的类型，但大小是固定的。
~~~cpp
auto tuple_a = make_tuple("str", 'c', 1, 1.1);
//等价于
tuple<char *, char, int, double> tuple_a("str", 'c', 1, 1.1);

string a;
char b;
int c;
double d;
std::tie(a,b,c,d) = tuple_a; //通过tie把元组里的元素解包出来，或者，通过位置get想要的值
cout<< get<0>(tuple_a)<<get<1>(tuple_a)<<endl;
//获取tuple长度：
cout<< tuple_size<decltype(tuple_a)>::value;
~~~

#### 6. std::array
array与vector很像，都是数组的扩展，只不过，array是存储在栈区的，而vector是存储在堆区；另外array的长度必须是编译期常量——可在编译期间计算出来。
~~~cpp
std::array<int, 4> arr= {1,2,3,4};
int len = 4;
std::array<int, len> arr = {1,2,3,4}; // 非法, 数组大小参数必须是常量表达式
~~~



